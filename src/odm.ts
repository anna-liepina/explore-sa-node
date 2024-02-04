import AWS from 'aws-sdk';

AWS.config.update({ region: process.env.AWS_REGION });

export const dynamodb = new AWS.DynamoDB();

export const documentClient = new AWS.DynamoDB.DocumentClient();
