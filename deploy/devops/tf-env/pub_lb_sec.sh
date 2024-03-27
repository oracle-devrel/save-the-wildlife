#!/bin/bash

# shellcheck disable=SC2155
export SEC_LIST_ID=$(oci network subnet get --subnet-id $PUB_LB_SUBNET_ID --query 'data."security-list-ids"[0]' --raw-output)

oci network security-list update --security-list-id $SEC_LIST_ID --egress-security-rules '[{"destination": "10.22.144.0/20", "protocol": "6", "isStateless": false, "tcpOptions": {"destinationPortRange": {"max": 10256, "min": 10256}}}]' --force