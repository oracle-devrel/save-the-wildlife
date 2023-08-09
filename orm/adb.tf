module "base" {
  source  = "oracle-terraform-modules/iam/oci"
  version = "2.0.2"
}

module "db_admin_password" {
  source = "./modules/password"
  password = var.ADMIN_PASSWORD
}

module "db" {
  count = var.create_database ? 1 : 0

  source = "./modules/autonomous_db"
  depends_on = [
    module.db_admin_password,
  ]

  is_free_tier             = var.IS_FREE_TIER
  db_workload              = var.autonomous_database_type
  cpu_core_count           = var.autonomous_database_cpu_core_count
  data_storage_size_in_tbs = var.autonomous_database_data_storage_size_in_tbs
  admin_password           = module.db_admin_password.content
  compartment_id           = var.compartment_ocid
  display_name             = var.ADB_NAME
  freeform_tags            = var.freeform_tags["db"]
  customer_contacts        = var.customer_contacts
}

module "wallet_password" {
  source = "./modules/password"
  password = var.ADMIN_PASSWORD
}

module "wallet" {
  source = "./modules/wallet"
  depends_on = [
    module.db,
    module.wallet_password
  ]

  db_id  = var.create_database ? module.db[0]._id : var.database
  wallet_password = module.wallet_password.content
  wallet_install_dir = var.INSTALL_HOME
}

module "db_user_password" {
  source = "./modules/password"
  password = var.DB_PASSWORD
}

module "database_configuration" {
  source = "git::http://github.com/denismakogon/terraform-run-bash-script-module.git?ref=main"
  
  depends_on = [
    module.db_admin_password,
    module.db_user_password,
    module.wallet,
  ]

  environment = {
    PACKAGE_BASEURL=var.package_baseurl,
    PACKAGE_NAME=var.package_install,
    INSTALL_HOME=var.INSTALL_HOME,
    WALLET_DIR=var.INSTALL_HOME,
    ADB_NAME=var.create_database ? var.ADB_NAME : data.oci_database_autonomous_database.provisioned_autonomous_database.db_name,
    DB_USER=upper(var.DB_USER),
    DB_PASSWORD=nonsensitive(module.db_user_password.content),
    DB_SCHEMA=upper(var.DB_SCHEMA),
    APEX_WORKSPACE=upper(var.APEX_WORKSPACE),
    ADMIN_PASSWORD=nonsensitive(module.db_admin_password.content),
  }

  create_command = "chmod 755 ./scripts/*.sh && ./scripts/run_configuration.sh"
  # destroy_command = "rm -fr ${var.INSTALL_HOME}"
}

data "oci_database_autonomous_database" "provisioned_autonomous_database" {
  autonomous_database_id = var.create_database ? module.db[0]._id : var.database
}

module "f1sim_vcn" {
  source = "oracle-terraform-modules/vcn/oci"

  # general oci parameters
  compartment_id = var.compartment_ocid
  vcn_name = "f1sim_vcn"

  # vcn parameters
  lockdown_default_seclist = false # boolean: true or false
  create_internet_gateway  = true
  create_service_gateway  = true
  subnets = {
    f1sim_public_vcn = {
      name = "f1sim_public_subnet"
      type = "public"
      cidr_block = "10.0.0.0/24"
    }
  }
}

resource "oci_core_network_security_group" "data_ingestion_nsg" {
  #Required
  compartment_id = var.compartment_ocid
  vcn_id           = module.f1sim_vcn.vcn_id
  display_name = "data_ingestion_nsg"
}

resource "oci_core_network_security_group_security_rule" "data_ingestion_nsg_rule" {
  #Required
  network_security_group_id = oci_core_network_security_group.data_ingestion_nsg.id
  direction = "INGRESS"
  protocol = "17"
  # destination = "0.0.0.0/0"
  source = var.local_cidr_block // "0.0.0.0/0"
  source_type = "CIDR_BLOCK"
  udp_options {
    destination_port_range {
      #Required
      min = 20777
      max = 20777
    }
  }
}

data "template_file" "cloud-config" {
  template = <<YAML
#cloud-config
runcmd:
  - echo 'This instance was provisioned by Terraform.' >> /etc/motd
users:
  - default
YAML
}

# * This module will create a shape-based Compute Instance. OCPU and memory values are defined by the provided value for shape.
module "f1sim_instance" {
  # source = "git::https://github.com/oracle-terraform-modules/terraform-oci-compute-instance" ## use this to test directly from Github HEAD
  source = "oracle-terraform-modules/compute-instance/oci"
  # general oci parameters
  compartment_ocid = var.compartment_ocid
  # compute instance parameters
  ad_number             = var.instance_ad_number
  instance_count        = var.instance_count
  instance_display_name = var.instance_display_name
  instance_state        = var.instance_state
  instance_flex_memory_in_gbs = var.instance_flex_memory_in_gbs # only used if shape is Flex type
  instance_flex_ocpus         = var.instance_flex_ocpus
  shape                 = var.shape
  source_ocid           = var.source_ocid
  source_type           = var.source_type
  cloud_agent_plugins   = var.cloud_agent_plugins
  # operating system parameters
  ssh_public_keys = "${var.ssh_public_keys}\n${tls_private_key.public_private_key_pair.public_key_openssh}"
  user_data = "${base64encode(data.template_file.cloud-config.rendered)}"
  # networking parameters
  assign_public_ip     = true
  public_ip            = "EPHEMERAL" # NONE, RESERVED or EPHEMERAL
  subnet_ocids         = [module.f1sim_vcn.subnet_id["f1sim_public_subnet"]]
  # network_security_group_id = oci_core_network_security_group.data_ingestion_nsg.id
  primary_vnic_nsg_ids = [oci_core_network_security_group.data_ingestion_nsg.id]
  # storage parameters
  boot_volume_backup_policy  = var.boot_volume_backup_policy
  # block_storage_sizes_in_gbs = var.block_storage_sizes_in_gbs
  # create_vnic_details {
  # nsg_ids = oci_core_network_security_group.data_ingestion_nsg.id
  # }
}


data "oci_core_shapes" "shapes" {
  compartment_id = var.compartment_ocid
}

resource tls_private_key public_private_key_pair {
  algorithm   = "RSA"
}

resource local_file ssh_key_private {
  content  = tls_private_key.public_private_key_pair.private_key_pem
  filename = "${path.module}/id_rsa"

  provisioner local-exec {
    command = "chmod 600 ${path.module}/id_rsa"
  }
}

resource null_resource export_file_wallet {
  depends_on = [
    module.wallet,
    module.f1sim_instance,
  ]
  
  connection {
    agent       = false
    timeout     = "30m"
    host        = module.f1sim_instance.public_ip_all_attributes[0]["ip_address"]
    user        = "opc"
    private_key = tls_private_key.public_private_key_pair.private_key_pem
  }

  provisioner remote-exec {
    inline = [
      "sudo dnf module install -y python39",
      "sudo dnf install -y git",
      "sudo firewall-cmd --permanent --zone=public --add-port=20777/udp",
      "sudo firewall-cmd --reload",
      "mkdir /home/opc/f1sim",
      "cd /home/opc/f1sim",
      "git clone https://git.opcvr.tech/esports/dataingestion.git",
    ]
  }

  provisioner file {
    source     = "${var.INSTALL_HOME}/wallet.zip"
    destination = "/home/opc/f1sim/dataingestion/Wallet.zip"
  }
  
}

# resource "oci_kms_vault" "generated_oci_kms_vault" {
# 	compartment_id = var.compartment_ocid
# 	display_name = "f1simvault"
# 	vault_type = "VIRTUAL_PRIVATE"
# }
