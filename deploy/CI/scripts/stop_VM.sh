#!/bin/bash

start_time=$(date +%s)

banner()
{
  echo "+------------------------------------------+"
  printf "| %-40s |\n" "`date`"
  echo "|                                          |"
  printf "|`tput bold` %-40s `tput sgr0`|\n" "$@"
  echo "+------------------------------------------+"
}

if [ -z "$BASE_DIR" ]
then
  export BASE_DIR=$(pwd)
fi

banner "Terraform Destroy"
cd $BASE_DIR/deploy/vm/terraform
terraform destroy -auto-approve

banner "Clean"
cd $BASE_DIR/deploy/vm/terraform
rm -rf generated

cd $BASE_DIR
end_time=$(date +%s)
elapsed=$(( end_time - start_time ))
echo "Time: $elapsed sec"