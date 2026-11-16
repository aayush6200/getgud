#!/bin/sh
# Deploy GetGud to AWS.   ./deploy.sh <aws-profile> [region]
# First run creates the stack. Later runs only upload new code. Remove everything with:
#   aws cloudformation delete-stack --stack-name getgud --profile <aws-profile> --region <region>
set -e
cd "$(dirname "$0")"
PROFILE="${1:?usage: ./deploy.sh <aws-profile> [region]}"; REGION="${2:-us-east-1}"; STACK=getgud
AWS="aws --profile $PROFILE --region $REGION"
KEYFILE=.team-key; [ -f "$KEYFILE" ] || (umask 077; openssl rand -hex 8 > "$KEYFILE")
$AWS cloudformation deploy --stack-name $STACK --template-file infra/template.yaml --capabilities CAPABILITY_IAM --parameter-overrides "TeamKey=$(cat $KEYFILE)" --no-fail-on-empty-changeset
npm install --omit=dev --silent
rm -f /tmp/getgud.zip && zip -qr /tmp/getgud.zip server.js views.js store.js lambda.js package.json shared public node_modules
FN=$($AWS cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='Function'].OutputValue" --output text)
$AWS lambda update-function-code --function-name "$FN" --zip-file fileb:///tmp/getgud.zip --query LastModified --output text
$AWS lambda wait function-updated --function-name "$FN"
URL=$($AWS cloudformation describe-stacks --stack-name $STACK --query "Stacks[0].Outputs[?OutputKey=='SiteUrl'].OutputValue" --output text)
echo "Live at:  $URL"
echo "Team log: ${URL}team-log?key=$(cat $KEYFILE)"
