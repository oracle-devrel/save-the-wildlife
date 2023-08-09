## Copyright © 2022, Oracle and/or its affiliates. 
## All rights reserved. The Universal Permissive License (UPL), Version 1.0 as shown at http://oss.oracle.com/licenses/upl

output "OKE_NodePool" {
  value = module.oci-oke.node_pool
}

output "OKE_Cluster" {
  value = module.oci-oke.cluster
}


output "generated_ssh_private_key" {
  value     = tls_private_key.public_private_key_pair.private_key_pem
  sensitive = true
}

output "chosen_node_shape_and_image" {
  value = module.oci-oke.chosen_node_shape_and_image
}

