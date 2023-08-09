#!/bin/bash

# Set OCI Auth Token and User (email) for the container registry
read -p "Enter your OCI OCIR Auth Token: " auth_token
export OCI_OCIR_TOKEN=""$auth_token""

read -p "Enter your OCI OCIR User (email): " user_email
export OCI_OCIR_USER="$user_email"

# Set Autonomous Database credentials
read -p "Enter the compartment name where the Autonomous Database is located: " adb_compartment_name
export ADB_COMPARTMENT_NAME="$adb_compartment_name"

read -p "Enter the name of the Autonomous Database: " adb_name
export ADB_NAME="$adb_name"

read -p "Enter the password for the Autonomous Database: " adb_password
export ADB_PASSWORD="$adb_password"