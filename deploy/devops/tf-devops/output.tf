output "devops_connection" {
  value = oci_devops_connection.devops_connection.base_url
}

output "deploy_id" {
  value = random_string.deploy_id.result
}

output "compartment" {
  value = data.oci_identity_compartment.compartment.name
}
