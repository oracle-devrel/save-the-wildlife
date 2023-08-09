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

banner "Build web"
cd $BASE_DIR/web
npm install
npm audit fix --force
npm run build

banner "Terraform Init"
cd $BASE_DIR/deploy/vm/terraform
terraform init -upgrade

banner "Terraform Apply"
terraform apply -auto-approve

sleep 25

cd $BASE_DIR/deploy/vm/ansible
banner "Ansible Provisioning"
ANSIBLE_HOST_KEY_CHECKING=False \
ANSIBLE_NOCOWS=1 \
ansible-playbook -i ../terraform/generated/app.ini ./site.yaml

banner "Output"
cd $BASE_DIR/deploy/vm/terraform
terraform output

cd $BASE_DIR

end_time=$(date +%s)
elapsed=$(( end_time - start_time ))
echo "Time: $elapsed sec"