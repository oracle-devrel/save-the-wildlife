resource "oci_kms_vault" "vault_devops" {
  compartment_id = var.compartment_ocid
  display_name   = "vault_${random_string.deploy_id.result}"
  vault_type     = "DEFAULT" // VIRTUAL_PRIVATE, DEFAULT
}

resource "oci_kms_key" "key_devops" {
  compartment_id = var.compartment_ocid
  display_name   = "master_key_devops_${random_string.deploy_id.result}"
  key_shape {
    algorithm = "AES"
    length    = 32
  }
  management_endpoint = oci_kms_vault.vault_devops.management_endpoint
}

resource "oci_vault_secret" "github_access_token_secret" {
  compartment_id = var.compartment_ocid
  secret_content {
    name         = "token_content_${random_string.deploy_id.result}"
    content      = base64encode(var.github_token)
    content_type = "BASE64"
    stage        = "CURRENT"
  }
  vault_id = oci_kms_vault.vault_devops.id
  key_id   = oci_kms_key.key_devops.id

  secret_name = "github_access_token_secret_devops_${random_string.deploy_id.result}"
  description = "GitHub Access Token Secret Devops for ${random_string.deploy_id.result}"

  depends_on = [random_string.deploy_id]
}

resource "oci_vault_secret" "adb_admin_password" {
  compartment_id = var.compartment_ocid
  secret_content {
    name         = "adb_admin_password_${random_string.deploy_id.result}"
    content      = base64encode(random_password.adb_admin_password.result)
    content_type = "BASE64"
    stage        = "CURRENT"
  }
  vault_id = oci_kms_vault.vault_devops.id
  key_id   = oci_kms_key.key_devops.id

  secret_name = "adb_admin_password_${random_string.deploy_id.result}"
  description = "ADB admin password for ${random_string.deploy_id.result}"

  depends_on = [random_string.deploy_id, random_password.adb_admin_password]
}

resource "oci_vault_secret" "redis_password" {
  compartment_id = var.compartment_ocid
  secret_content {
    name         = "redis_password_${random_string.deploy_id.result}"
    content      = base64encode(random_password.redis_password.result)
    content_type = "BASE64"
    stage        = "CURRENT"
  }
  vault_id = oci_kms_vault.vault_devops.id
  key_id   = oci_kms_key.key_devops.id

  secret_name = "redis_password_${random_string.deploy_id.result}"
  description = "REdis password for ${random_string.deploy_id.result}"

  depends_on = [random_string.deploy_id, random_password.redis_password]
}

resource "oci_vault_secret" "user_auth_token" {
  compartment_id = var.compartment_ocid
  secret_content {
    name         = "user_auth_token_${random_string.deploy_id.result}"
    content      = base64encode(oci_identity_auth_token.oke_ocir_user_auth_token.token)
    content_type = "BASE64"
    stage        = "CURRENT"
  }
  vault_id = oci_kms_vault.vault_devops.id
  key_id   = oci_kms_key.key_devops.id

  secret_name = "user_auth_token_${random_string.deploy_id.result}"
  description = "User Auth Token for ${random_string.deploy_id.result}"

  depends_on = [oci_identity_auth_token.oke_ocir_user_auth_token, random_string.deploy_id]
}
