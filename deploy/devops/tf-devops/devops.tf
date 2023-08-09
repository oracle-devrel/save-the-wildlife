resource "oci_logging_log_group" "devops_log_group" {
  compartment_id = var.compartment_ocid
  display_name   = "devops_log_group_${random_string.deploy_id.result}"
}

resource "oci_logging_log" "devops_log" {
  display_name = "devops_log_${random_string.deploy_id.result}"
  log_group_id = oci_logging_log_group.devops_log_group.id
  log_type     = "SERVICE"
  configuration {
    source {
      category    = "all"
      resource    = oci_devops_project.devops_project.id
      service     = "devops"
      source_type = "OCISERVICE"
    }
    compartment_id = var.compartment_ocid
  }
  is_enabled         = true
  retention_duration = 30
}

resource "oci_devops_project" "devops_project" {
  compartment_id = var.compartment_ocid
  name           = "devops_project_${random_string.deploy_id.result}"
  notification_config {
    topic_id = var.devops_ons_topic_ocid
  }
  description = "DevOps Project for ${random_string.deploy_id.result}"
}

resource "oci_devops_deploy_environment" "oke_deploy_environment" {
  deploy_environment_type = "OKE_CLUSTER"
  project_id              = oci_devops_project.devops_project.id
  cluster_id              = var.oke_cluster_ocid
  description             = "OKE for ${random_string.deploy_id.result}"
  display_name            = "oke_${random_string.deploy_id.result}"
}

resource "oci_devops_connection" "devops_connection" {
  connection_type = "GITHUB_ACCESS_TOKEN"
  username        = var.github_user
  access_token    = var.github_access_token_secret_id
  project_id      = oci_devops_project.devops_project.id
  base_url        = var.github_repo_url
  display_name    = "github_connection_${random_string.deploy_id.result}"
  description     = "GitHub Connection for ${random_string.deploy_id.result}"
}

resource "oci_devops_repository" "github_mirrored_repository" {
  name       = "github_mirrored_repository"
  project_id = oci_devops_project.devops_project.id

  default_branch  = "refs/heads/main"
  description     = "GitHub Mirrored Repository"
  repository_type = "MIRRORED"
  mirror_repository_config {
    connector_id   = oci_devops_connection.devops_connection.id
    repository_url = var.github_repo_url
    trigger_schedule {
      schedule_type   = "CUSTOM"
      custom_schedule = "FREQ=MINUTELY"
    }
  }
}

# resource "oci_devops_trigger" "push_trigger" {
#     actions {
#         build_pipeline_id = oci_devops_build_pipeline.build_pipeline.id
#         type = "TRIGGER_BUILD_PIPELINE"

#         filter {
#             trigger_source = "GITHUB" // "DEVOPS_CODE_REPOSITORY"

#             events = "PUSH"
#             include {
#                 repository_name = oci_devops_repository.github_mirrored_repository.name
#             }
#         }
#     }
#     project_id = oci_devops_project.devops_project.id
#     trigger_source = "GITHUB" // "DEVOPS_CODE_REPOSITORY"

#     description = "devops_github_trigger_${random_string.deploy_id.result}"
#     display_name = "DevOps GitHub Trigger for ${random_string.deploy_id.result}"
# }
