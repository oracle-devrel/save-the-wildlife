variable "num_instances" {
  default = "1"
}
variable "instance_name" {
  default = "ocimultiplayer"
}

variable "instance_shape" {
  default = "VM.Standard.E3.Flex"
}

variable "instance_ocpus" {
  default = 1
}

variable "instance_shape_config_memory_in_gbs" {
  default = 1
}

data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

data "oci_core_images" "ol8_images" {
  compartment_id           = var.compartment_ocid
  shape                    = var.instance_shape
  operating_system         = "Oracle Linux"
  operating_system_version = 8
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

data "oci_identity_availability_domain" "ad" {
  compartment_id = var.tenancy_ocid
  ad_number      = 1
}

resource "oci_core_instance" "compute_web" {
  count               = var.num_instances
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.compartment_ocid
  display_name        = "${var.instance_name}_web_${count.index}"
  shape               = var.instance_shape

  metadata = {
    ssh_authorized_keys = chomp(file(var.ssh_public_key_path))
  }

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_shape_config_memory_in_gbs
  }

  create_vnic_details {
    subnet_id                 = oci_core_subnet.publicsubnet.id
    display_name              = "${var.instance_name}web${count.index}"
    assign_public_ip          = true
    assign_private_dns_record = true
    hostname_label            = "${var.instance_name}web${count.index}"
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ol8_images.images[0].id
  }

  timeouts {
    create = "60m"
  }
}

resource "oci_core_instance" "compute_server" {
  count               = var.num_instances
  availability_domain = data.oci_identity_availability_domain.ad.name
  compartment_id      = var.compartment_ocid
  display_name        = "${var.instance_name}_server_${count.index}"
  shape               = var.instance_shape

  metadata = {
    ssh_authorized_keys = chomp(file(var.ssh_public_key_path))
  }

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_shape_config_memory_in_gbs
  }

  create_vnic_details {
    subnet_id                 = oci_core_subnet.publicsubnet.id
    display_name              = "${var.instance_name}server${count.index}"
    assign_public_ip          = true
    assign_private_dns_record = true
    hostname_label            = "${var.instance_name}server${count.index}"
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ol8_images.images[0].id
  }

  timeouts {
    create = "60m"
  }
}
