locals {
  cluster_k8s_latest_version = reverse(sort(data.oci_containerengine_cluster_option.oke.kubernetes_versions))[0]
}

module "oke" {
  source  = "oracle-terraform-modules/oke/oci"
  version = "5.1.3"
  region = var.region
  compartment_id = var.compartment_ocid
  # IAM - Policies
  create_iam_autoscaler_policy = "never"
  create_iam_kms_policy = "never"
  create_iam_operator_policy = "never"
  create_iam_worker_policy = "never"
  # Network module - VCN
  subnets = {
    bastion = {
      create = "never"
    }
    operator = {
      create = "never"
    }
    cp = {
      create  = "always",
      cidr = "10.22.0.8/29"
    }
    pub_lb = {
      create  = "always",
      cidr = "10.22.128.0/27"
    }
    workers = {
      create  = "always",
      cidr = "10.22.144.0/20"
    }
    int_lb = {
      create  = "never"
    }
    pods = {
      create  = "never"
    }
  }
  nsgs = {
    bastion = {create = "never"}
    operator = { create = "never" }
    cp       = { create = "always"}
    int_lb   = { create = "never" }
    pub_lb   = { create = "always" }
    workers  = { create = "always"}
    pods     = { create = "never" }
  }
  assign_dns = true
  create_vcn = true
  vcn_cidrs = ["10.22.0.0/16"]
  vcn_dns_label = "oke"
  vcn_name = "oke-${random_string.deploy_id.result}-vcn"
  lockdown_default_seclist = true
  allow_rules_public_lb ={
    "Allow TCP ingress to public load balancers for SSL traffic from anywhere" : { protocol = 6, port = 443, source="0.0.0.0/0", source_type="CIDR_BLOCK"},
    "Allow TCP ingress to public load balancers for HTTP traffic from anywhere" : { protocol = 6, port = 80, source="0.0.0.0/0", source_type="CIDR_BLOCK"},
    "Allow TCP egress from public load balancers to worker nodes for health checks" : {protocol = 6, port=-1, destination = "10.22.144.0/20", destination_type="CIDR_BLOCK"}
  }
  # Network module - security
  allow_node_port_access = true
  allow_worker_internet_access = true
  allow_worker_ssh_access = true
  control_plane_allowed_cidrs = ["0.0.0.0/0"]
  control_plane_is_public = true
  assign_public_ip_to_control_plane = true
  enable_waf = false
  load_balancers = "public"
  preferred_load_balancer = "public"
  worker_is_public = false
  # Cluster module
  create_cluster = true
  cluster_name = "oke-${random_string.deploy_id.result}"
  cluster_type = "basic"
  cni_type = "flannel"
  kubernetes_version = local.cluster_k8s_latest_version
  pods_cidr          = "10.244.0.0/16"
  services_cidr      = "10.96.0.0/16"
  use_signed_images  = false
  use_defined_tags = false
  # Workers
  worker_pool_mode = "node-pool"
  worker_pool_size = 2
  worker_image_type = "oke"
  worker_pools = {
    np1 = {
      shape = "VM.Standard.E3.Flex",
      ocpus = 1,
      memory = 32,
      boot_volume_size = 120,
      create = true
    }
  }

  # Bastion
  create_bastion = false

  # Operator
  create_operator = false

  providers = {
    oci = oci
    oci.home = oci.home_region
  }
}

