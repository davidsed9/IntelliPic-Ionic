// This api route begins the training process
// should work the same as fine_tune_model from previous main.py

// Route to call from the front-end: api/{$user.id}/train

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

// TODO: translate fine_tune_model to work with replicate (show follow similar steps)
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  
  const SUPABASE_PREFIX_URL = "https://jwbyizeytvnlasmwdkro.supabase.co/"
  const SUPABASE_TABLE_NAME = "finetuningruns"
  const SUPABASE_BUCKET_NAME = "fine-tuning-bucket"
  const SUPABASE_OBJECT_URL = `${SUPABASE_PREFIX_URL}storage/v1/object/public/${SUPABASE_BUCKET_NAME}/`
  
  // get request data and instatiate useful data
  const instanceClass = req.body.instance_type as string;
  const url = req.body.url as string;
  const id = req.query.userId as string;
  const instanceToken = req.body.prompt as string;
  const instanceData = SUPABASE_OBJECT_URL + url;

  // initiate training
  // TODO: add REPLICATE_USERNAME to .env.local file
  const responseReplicate = await replicateClient.post(
    "/v1/trainings",
    {
      input: {
        instance_prompt: `a photo of a ${instanceToken} ${instanceClass}`,
        class_prompt: `a photo of a ${instanceClass}`,
        instance_data: instanceData,
        max_train_steps: 1300,
        num_class_images: 100,
        learning_rate: 2e-6,
      },
      model: `${process.env.REPLICATE_USERNAME}/${id}`,
      trainer_version: "d5e058608f43886b9620a8fbb1501853b8cbae4f45c857a014011c86ee614ffb",
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  const replicateModelId = responseReplicate.data.id as string;

  // update user's data in supabase
  const { error } = await supabase
    .from(SUPABASE_TABLE_NAME)
    .update({run_id: replicateModelId})
    .eq("user_id", id)

  // return response
  return res.json({responseReplicate});
};

export default handler;
