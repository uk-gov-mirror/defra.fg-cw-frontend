#!/bin/bash
export AWS_REGION=eu-west-2
export AWS_DEFAULT_REGION=eu-west-2
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

# S3 buckets for fg-cw-frontend
# aws --endpoint-url=http://localhost:4566 s3 mb s3://fg-cw-frontend-assets

# SNS topics for frontend events
aws --endpoint-url=http://localhost:4566 sns create-topic --name frontend_user_action
aws --endpoint-url=http://localhost:4566 sns create-topic --name case_view_event

# SQS queues for frontend processing
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name frontend_analytics
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name frontend_analytics-deadletter
aws --endpoint-url=http://localhost:4566 sqs create-queue --queue-name frontend_analytics-recovery

# Configure dead letter queue
aws --endpoint-url=http://localhost:4566 sqs set-queue-attributes \
--queue-url http://sqs.eu-west-2.127.0.0.1:4566/000000000000/frontend_analytics \
--attributes '{ "RedrivePolicy": "{\"deadLetterTargetArn\":\"arn:aws:sqs:eu-west-2:000000000000:frontend_analytics-deadletter\", \"maxReceiveCount\":\"3\", \"visibilityTimeout\":\"30\"}" }'

# Subscribe queue to topics
aws --endpoint-url=http://localhost:4566 sns subscribe --topic-arn arn:aws:sns:eu-west-2:000000000000:frontend_user_action \
--protocol sqs --notification-endpoint arn:aws:sqs:eu-west-2:000000000000:frontend_analytics \
--attributes '{ "RawMessageDelivery": "true"}'