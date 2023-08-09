
variable "config_file_profile" {
  type    = string
  default = "DEFAULT"
}

variable "tenancy_ocid" {
  type = string
}

variable "region" {
  type = string
}

variable "compartment_ocid" {
  type = string
}

variable "namespace" {
  type = string
}

variable "region_key" {
  type = string
}

variable "github_repo_url" {
  type = string
}

variable "github_user" {
  type = string
}

variable "github_access_token_secret_id" {
  type = string
}

variable "ocir_user" {
  type = string
}

variable "devops_ons_topic_ocid" {
  type = string
}

variable "oke_cluster_ocid" {
  type = string
}

variable "user_auth_token_id" {
  type = string
}

variable "adb_admin_password_id" {
  type = string
}

variable "redis_password_id" {
  type = string
}

variable "adb_service" {
  type = string
}

variable "adb_id" {
  type = string
}
