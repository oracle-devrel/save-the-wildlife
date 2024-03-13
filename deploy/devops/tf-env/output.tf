output "devops_ons_topic_ocid" {
  value = oci_ons_notification_topic.devops_ons_topic.id
}

output "kubeconfig" {
  value     = data.oci_containerengine_cluster_kube_config.kubeconfig.content
  sensitive = true
}

output "oke_cluster_ocid" {
  value = module.oke.cluster_id
}

output "github_access_token_secret_ocid" {
  value = oci_vault_secret.github_access_token_secret.id
}

output "deploy_id" {
  value = random_string.deploy_id.result
}

output "compartment_id" {
  value = data.oci_identity_compartment.compartment.id
}

output "user_ocid" {
  value = oci_identity_user.oke_ocir_user.id
}

output "user_name" {
  value = oci_identity_user.oke_ocir_user.name
}

output "user_auth_token_id" {
  sensitive = false
  value     = oci_vault_secret.user_auth_token.id
}

output "adb_admin_password_id" {
  sensitive = true
  value     = oci_vault_secret.adb_admin_password.id
}

output "redis_password_id" {
  sensitive = true
  value     = oci_vault_secret.redis_password.id
}

output "adb_service" {
  sensitive = false
  value     = oci_database_autonomous_database.adb.db_name
}

output "adb_id" {
  sensitive = false
  value     = oci_database_autonomous_database.adb.id
}
