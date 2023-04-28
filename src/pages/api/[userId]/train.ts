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

// TODO: translate fine_tune_model to work with replicate (show follow similar steps)
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // get request data and instatiate useful data
  // ...

  // initiate training
  // TODO: add REPLICATE_USERNAME to .env.local file
  const responseReplicate = await replicateClient.post(
    "/v1/trainings",
    {
      input: {
        instance_prompt: `a photo of a ${process.env.NEXT_PUBLIC_REPLICATE_INSTANCE_TOKEN} ${instanceClass}`,
        class_prompt: `a photo of a ${instanceClass}`,
        instance_data: `https://${process.env.S3_UPLOAD_BUCKET}.s3.amazonaws.com/${project.id}.zip`,
        max_train_steps: Number(process.env.REPLICATE_MAX_TRAIN_STEPS),
        num_class_images: 200,
        learning_rate: 1e-6,
      },
      model: `${process.env.REPLICATE_USERNAME}/${project.id}`,
      webhook_completed: `${process.env.NEXTAUTH_URL}/api/webhooks/completed`,
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
  // ...

  // return response
  return res.json({ ... });
};

export default handler;
