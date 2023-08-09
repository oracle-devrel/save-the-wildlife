#!/bin/bash

# Set the OCI profile to use
read -p "Enter the OCI Profile: " OCI_PROFILE
read -p "Enter the OCI Registry username: " REGISTRY_USERNAME

# Prompt the user for the container instance ID to destroy
read -p "Enter the ID of the container instance to destroy: " CONTAINER_INSTANCE_ID

# Destroy the container instance
oci container-instances container-instance delete \
  --container-instance-id $CONTAINER_INSTANCE_ID \
  --force \
  --config-file ~/.oci/config --profile $OCI_PROFILE --auth api_key

echo "Container instance destroyed: $CONTAINER_INSTANCE_ID"
