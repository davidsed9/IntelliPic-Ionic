// this api route checks the status of the model
// should work the same as model_status from previous main.py
// TODO: Define request and response shape
// TODO: Create the function itself

// req.body = {
//   url: fineTuningData.dataset,
//   prompt: instanceName,
//   instance_type: instanceType,
// }

// res.body = {
//   run_id: model.id;
// }

import { NextApiRequest, NextApiResponse } from "next";
import replicateClient from "@/core/clients/replicate";
import { supabase } from "@/supabaseClient";

// TODO: Fix function pls
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const SUPABASE_TABLE_NAME = "finetuningruns"
  const userId = req.query.userId as string;

  await supabase
    .from(SUPABASE_TABLE_NAME)
    .select("*")
    .eq("user_id", userId)
    .then(async (data) => {
      if (!data.data?.[1] === null){
        fetch(`https://dreambooth-api-experimental.replicate.com/v1/trainings/${data.data?.[1]}`)
          .then((model) => model.json())
          .then((json) => {
            console.log(json)
            return res.status(200).json({healthy: json.output.status === "succeeded" , model_id: data.data?.[1]})
        })
      } else {
        return res.status(200).json({healthy: false, model_id: null})
      }      
    });
}

export default handler;
