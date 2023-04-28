// This api route calls the model (if exists) and returns a predition image
// should work the same as call_model from previous main.py

// Might have to create a predictions and then get the prediction
// check out Replicate HTTP api docs: https://replicate.com/docs/reference/http

// Route to call from the front-end: api/{$user.id}/useModel

// req.body = {
//   prompt: prompt,
//   id: model.id
// }

// res.body = {
//   url: url
// }

import replicateClient from "@/core/clients/replicate";
import { NextApiRequest, NextApiResponse } from "next";

// TODO: translate fine_tune_model to work with replicate (show follow similar steps)
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // get request data
  const prompt = req.body.prompt as string;
  const id = req.body.id as string
  const user = req.query.userId as string;

  // call model
  const { data } = await replicateClient.post(
    `https://api.replicate.com/v1/predictions`,
    {
      input: {
        prompt: prompt,
        negative_prompt: process.env.REPLICATE_NEGATIVE_PROMPT,
      },
      version: project.modelVersionId,
    }
  );

  // generate response
  // ...

  // return response
  return res.json({ shot });
};

export default handler;
