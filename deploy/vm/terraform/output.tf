output "compute_web" {
  value = oci_core_instance.compute_web[0].public_ip
}

output "compute_server" {
  value = oci_core_instance.compute_server[0].public_ip
}

output "lb_public_ip" {
  value = oci_core_public_ip.public_reserved_ip.ip_address
}

output "adName" {
  value = data.oci_identity_availability_domains.ads.availability_domains[0].name
}

output "subnetId" {
  value = oci_core_subnet.publicsubnet.id
}

output "vcnName" {
  value = oci_core_virtual_network.multiplayervcn.dns_label
}

output "compartmentId" {
  value = var.compartment_ocid
}


output "user_ocid" {
  value = oci_identity_user.ci_user.id
}

output "user_name" {
  value = oci_identity_user.ci_user.name
}

output "user_auth_token" {
  sensitive = true
  value     = oci_identity_auth_token.ci_user_auth_token.token
}
