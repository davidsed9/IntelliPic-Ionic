import React, { useEffect, useRef, useState } from "react";
import { Capacitor } from '@capacitor/core';


import { useIsomorphicLayoutEffect, useTimeout } from "usehooks-ts";

import { supabase } from "../supabaseClient";
import { useUser } from "@supabase/auth-helpers-react";
import Router from "next/router";
import JSZip from "jszip";

import styles from "./Home.module.css";
import Header from "../components/Header";
import classNames from "classnames";

const BASETEN_PROJECT_ROUTE = "https://app.baseten.co/routes/V0NdMvq"
const FINETUNING_BUCKET = "fine-tuning-bucket"; // Update to the bucket name you chose on Supabase Storage

async function post(url: string, body: any, callback: any) {
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((response) => response.json())
    .then(callback);
}

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback if it changes.
  useIsomorphicLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return;
    }

    const id = setInterval(() => savedCallback.current(), delay);

    return () => clearInterval(id);
  }, [delay]);
}

export default function Home() {
  const SUPABASE_TABLE_NAME = "finetuningruns"
  const user = useUser();
  const [ready, setReady] = useState(false);
  const [fineTuningData, setFinetuningData] = useState({
    dataset: null,
    run_id: null,
    run_data: {
      status: null,
    },
  });

  const [modelStatus, setModelStatus] = useState({
    healthy: null,
    modelId: null,
  });
  const [instancePrompt, setInstancePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [queueingFinetuning, setQueueingFinetuning] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  // Instance Type that defaults to "Man"
  const [instanceType, setInstanceType] = useState("Man");
  const [predictionId, setPredictionId] = useState("");
  const [queueingPrediction, setQueueingPrediction] = useState(false);
  
  // This useEffect to fetches the last prediction made by the current user
  useEffect(()=>{
    const sub = async() => {
      await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', {ascending: false})
        .limit(1)
        .then((data) => {
          const predictionData = data.data?.[0];
          if(!!predictionData){
            setPredictionId(predictionData.id)
            if(!(predictionData.status === "succeeded")){
              setQueueingPrediction(true);
            }
          }
        });
    }
    sub();
  },[])

  useEffect(() => {
    if (!user) {
      Router.push("/login");
    }
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        getOrInsertUserData(user);
        getModelStatus(user);
      }
    };

    fetchData();
  }, [user]);

  useInterval(() => getOrInsertUserData(user), 10000);
  useInterval(() => getModelStatus(user), 10000);
  useInterval(() => handleGetPrediction(), 3000)
  

  async function clearUserData(user: any) {
    post(
      `api/${user.id}/clear`,
      { },
      (data: any) => setFinetuningData(data.output)
    );
    setPredictionId("");
    setQueueingPrediction(false);
  }

  async function getOrInsertUserData(user: any) {
  await fetch(`api/${user.id}`)
  .then((response) => response.json())
  .then((data) => {
    setFinetuningData(data)
  });

  setReady(true);
}

  async function getModelStatus(user: any) {
    
    await fetch(`api/${user?.id}/status`)
      .then((response) => response.json())
      .then((data) => {
        setModelStatus({
          modelId: data.model_id,
          healthy: data.healthy,
        })
      });

    setReady(true);
  }

  async function handleFileUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    setUploading(true);
    const files = ev.target.files || [];
    const zip = new JSZip();
    const dataFolder = zip.folder("data");

    if (dataFolder) {
      if (dataFolder) {
        for (let file = 0; file < files.length; file++) {
          dataFolder.file(files[file].name, files[file]);
        }
      }
    }

    zip.generateAsync({ type: "blob" }).then(async (content) => {
      try {
        await supabase.storage
          .from(FINETUNING_BUCKET)
          .remove([`public/${user?.id}/data.zip`]);
      } catch (error) {
        console.log(error);
      }
      const { data } = await supabase.storage
        .from(FINETUNING_BUCKET)
        .upload(`public/${user?.id}/data.zip`, content);
      if (data) {
        await supabase
          .from("finetuningruns")
          .update({ dataset: `public/${user?.id}/data.zip` })
          .eq("user_id", user?.id)
          .select();
        getOrInsertUserData(user);
      }
      setUploading(false);
    });
  }

  // Include instanceType on the object sent to Blueprint with the name instance_type
  async function handleValidationAndFinetuningStart() {
    setQueueingFinetuning(true);
    await post(
      `api/${user?.id}/train`,
      {
        url: fineTuningData.dataset,
        prompt: instanceName,
        instance_type: instanceType,
      },
      (data: any) => console.log(data)
    );
    getOrInsertUserData(user);
    setQueueingFinetuning(false);
  }

  async function handleCallModel() {
    post(
      `api/${user?.id}/call-model`,
      {
        run_id: fineTuningData.run_id,
        instance_prompt: instancePrompt,
      },
      (data: any) => {
        setPredictionId(data.prediction_id);
        setQueueingPrediction(true);
      }
    );
  }

  async function handleGetPrediction(){
    if(queueingPrediction){
      post(
        `api/${user?.id}/get-prediction`,
        {
          prediction_id: predictionId
        },
        (data: any) => {
          console.log(data)
          if(data.status==="succeeded"){
            setImageUrl(data.output)
            setQueueingPrediction(false)
          }
        }
      )
    }
  }

  const hasUploadedData = !!fineTuningData?.dataset;
  const hasFinetunedModel = !!fineTuningData?.run_id;
  const runStatus = fineTuningData?.run_data?.status;
  const itemButton = useRef<HTMLInputElement>(null);
  const fineTuningInProgress =
    runStatus === "RUNNING" || runStatus === "PENDING";
  const fineTuningFailed = runStatus === "FAILED";

  return (
    <div>
      <Header />
      {ready && (
        <div>
          <main className={styles.main}>
            <div
              className={classNames(styles.step, {
                [styles.complete]: hasUploadedData,
              })}
            >
              <div>
                <div className={styles.stepheading}>Subir Imágenes</div>
                <div>
                    Selecciona algunas imágenes para entrenar a la IA con un modelo
                </div>

                {!hasUploadedData && (
                  <div>
                    <input
                      type="file"
                      id="files"
                      className={styles.hidden}
                      multiple
                      onChange={handleFileUpload}
                      ref={itemButton}
                    />
                    <label htmlFor="files">
                      <button
                        className={classNames([
                          styles.button,
                          styles.primary,
                          {
                            [styles.inactive]: uploading,
                          },
                        ])}
                        onClick={() =>
                          !uploading && itemButton.current?.click()
                        }
                        disabled={uploading}
                      >
                        Subir Imágenes
                      </button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            <div
              className={classNames(styles.step, {
                [styles.ineligible]: !hasUploadedData,
                [styles.complete]: hasFinetunedModel,
                [styles.blinker]: fineTuningInProgress,
                [styles.failed]: fineTuningFailed,
              })}
              style={{ marginBottom: 0 }}
            >
              <div>
                <div className={styles.stepheading}>Ajustar el modelo</div>
                <div>Para comenzar a entrenar la IA.<br />Dale un nombre único a tu modelo (Por ejemplo Davidrmk)</div>
                <div
                  className={classNames(styles.finetuningsection, {
                    [styles.hidden]: hasFinetunedModel || !hasUploadedData,
                  })}
                >
                  <input
                    className={styles.instance}
                    value={instanceName}
                    onChange={(ev) => setInstanceName(ev.target.value)}
                    placeholder={"Unique instance name"}
                  />
                  {/* New select for the instance type */}
                  <select name="instance_type" id="ip" className={styles.instance} onChange={(ev) => setInstanceType(ev.target.value)}>
                    <option value="man">Hombre</option>
                    <option value="woman">Mujer</option>
                    <option value="dog">Perro</option>
                    <option value="cat">Gato</option>
                    <option value="thing">Cosa</option>
                  </select>
                  <button
                    disabled={
                      instanceName.length === 0 ||
                      hasFinetunedModel ||
                      queueingFinetuning
                    }
                    onClick={handleValidationAndFinetuningStart}
                    className={classNames(styles.button, styles.primary)}
                    style={{
                      marginLeft: "8px",
                      pointerEvents:
                        instanceName.length === 0 ||
                        hasFinetunedModel ||
                        queueingFinetuning
                          ? "none"
                          : "inherit",
                    }}
                  >
                    🪄 Tune
                  </button>
                </div>
              </div>
            </div>
          </main>

          {modelStatus.healthy && (
            <main className={styles.main}>
              <div className={classNames(styles.step, styles.columnstep)}>
                <div className={styles.prompt}>
                  <input
                    className={classNames(styles.input, styles.promptinput)}
                    value={instancePrompt}
                    onChange={(e) => setInstancePrompt(e.target.value)}
                    placeholder="' Retrato de primer plano de Davidrmk como un vikingo'"
                  />
                  <button
                    onClick={handleCallModel}
                    className={classNames(styles.button, styles.primary)}
                    style={{ marginTop: 0 }}
                  >
                    Generar
                  </button>
                </div>
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className={classNames(styles.image, styles.modeloutput)}
                    alt="Generated image"
                    width={400}
                    height={400}
                    src={imageUrl}
                  />
                )}
              </div>
            </main>
          )}

          <main className={styles.main}>
            <div className={styles.clear}>
              <button
                onClick={() => clearUserData(user)}
                className={classNames(styles.button, styles.reset)}
              >
                Empezar de nuevo
              </button>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
