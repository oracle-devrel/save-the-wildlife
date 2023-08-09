output "lb_public_ip" {
  value = oci_core_public_ip.ci_public_reserved_ip.ip_address
}
