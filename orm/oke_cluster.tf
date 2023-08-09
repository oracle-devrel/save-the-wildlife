## Copyright © 2022, Oracle and/or its affiliates. 
## All rights reserved. The Universal Permissive License (UPL), Version 1.0 as shown at http://oss.oracle.com/licenses/upl

module "oci-oke" {
  source                            = "github.com/oracle-devrel/terraform-oci-arch-oke"
  tenancy_ocid                      = var.tenancy_ocid
  compartment_ocid                  = var.compartment_ocid
  availability_domain               = var.availablity_domain_name
  oke_cluster_name                  = var.cluster_name
  ssh_public_key                    = tls_private_key.public_private_key_pair.public_key_openssh
  node_shape                        = var.node_pool_shape
  node_ocpus                        = var.node_pool_flex_shape_ocpus
  node_memory                       = var.node_pool_flex_shape_memory
  node_count                        = var.node_pool_size
  node_linux_version                = var.linux_os_version
  k8s_version                       = var.kubernetes_version
  cluster_kube_config_token_version = var.cluster_kube_config_token_version
  pods_cidr                         = var.cluster_options_kubernetes_network_config_pods_cidr
  services_cidr                     = var.cluster_options_kubernetes_network_config_services_cidr
  use_existing_vcn                  = true
  vcn_id                            = oci_core_vcn.OKE_vcn.id
  is_api_endpoint_subnet_public     = true
  api_endpoint_subnet_id            = oci_core_subnet.OKE_api_endpoint_subnet.id
  is_lb_subnet_public               = true
  lb_subnet_id                      = oci_core_subnet.OKE_lb_subnet.id
  is_nodepool_subnet_public         = true
  nodepool_subnet_id                = oci_core_subnet.OKE_nodepool_subnet.id
  defined_tags                      = { "${oci_identity_tag_namespace.ArchitectureCenterTagNamespace.name}.${oci_identity_tag.ArchitectureCenterTag.name}" = var.release }
}
