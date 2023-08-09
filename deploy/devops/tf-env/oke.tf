module "oke-quickstart" {
  source = "github.com/oracle-quickstart/terraform-oci-oke-quickstart?ref=0.9.2"


  providers = {
    oci             = oci
    oci.home_region = oci.home_region
  }

  tenancy_ocid     = var.tenancy_ocid
  compartment_ocid = var.compartment_ocid
  region           = var.region

  app_name = "DevOps ${random_string.deploy_id.result}"

  metrics_server_enabled = false

  # OKE Node Pool 1
  node_pool_cni_type_1                 = "FLANNEL_OVERLAY"
  node_pool_autoscaler_enabled_1       = false
  node_pool_initial_num_worker_nodes_1 = 2
  node_pool_max_num_worker_nodes_1     = 3
  node_pool_instance_shape_1           = { "instanceShape" = "VM.Standard.E4.Flex", "ocpus" = 1, "memory" = 32 }
  node_pool_boot_volume_size_in_gbs_1  = 120

  # VCN for OKE arguments
  vcn_cidr_blocks = "10.22.0.0/16"
}
