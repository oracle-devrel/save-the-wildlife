locals {
  dynamic_group_name = "ci_dynamic_group_${random_string.deploy_id.result}"
  group_name         = "ci_group_${random_string.deploy_id.result}"
}


resource "oci_identity_dynamic_group" "ci_dynamic_group" {
  provider       = oci.home_region
  compartment_id = var.tenancy_ocid
  description    = "Container Instance Dynamic Group for ${random_string.deploy_id.result}"
  matching_rule  = "ALL { resource.type = 'computecontainerinstance', resource.compartment.id = '${var.compartment_ocid}' }"
  name           = local.dynamic_group_name
}

resource "oci_identity_policy" "ci_policy_in_tenancy" {
  provider       = oci.home_region
  compartment_id = var.tenancy_ocid
  name           = "ci_policies_tenancy_${random_string.deploy_id.result}"
  description    = "Allow dynamic group to manage ci at tenancy level for ${random_string.deploy_id.result}"
  statements = [
    "allow dynamic-group ${local.dynamic_group_name} to manage repos in tenancy",
  ]
}

resource "oci_identity_group" "ci_group" {
  provider       = oci.home_region
  compartment_id = var.tenancy_ocid
  description    = "Group for ${local.group_name}"
  name           = local.group_name
}

resource "oci_identity_user" "ci_user" {
  provider       = oci.home_region
  compartment_id = var.tenancy_ocid
  description    = "User to access OCIR"
  name           = "ci_user_${random_string.deploy_id.result}"

  email = "ci_user_${random_string.deploy_id.result}@example.com"
}

resource "oci_identity_auth_token" "ci_user_auth_token" {
  provider    = oci.home_region
  description = "User Auth Token to access OCIR"
  user_id     = oci_identity_user.ci_user.id
}

resource "oci_identity_policy" "ci_user_policy_in_tenancy" {
  provider       = oci.home_region
  compartment_id = var.tenancy_ocid
  name           = "ci_user_policies_tenancy_${random_string.deploy_id.result}"
  description    = "Allow group ${local.group_name} to pull container images at tenancy level for ${random_string.deploy_id.result}"
  statements = [
    "Allow group ${oci_identity_group.ci_group.name} to manage repos in tenancy"
  ]
}

resource "oci_identity_user_group_membership" "ci_user_group_membership" {
  provider = oci.home_region
  group_id = oci_identity_group.ci_group.id
  user_id  = oci_identity_user.ci_user.id
}
