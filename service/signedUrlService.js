import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "../infra/r2client.js";
import { configDotenv } from "dotenv";
configDotenv();

async function generateSignedUrl(key, expiresInSeconds = 3600) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  });

  return await getSignedUrl(r2, command, {
    expiresIn: expiresInSeconds,
  });
}

const signedUrlService = {
  generateSignedUrl,
};

export default signedUrlService;
