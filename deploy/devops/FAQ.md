# FAQ DevOps Deployment

## ERRORS


### Terraform apply timeout

```
Error: Operation Timeout
Service: Devops Deploy Artifact
```

Re-try the terraform apply by running again:

```
terraform apply -auto-approve
```