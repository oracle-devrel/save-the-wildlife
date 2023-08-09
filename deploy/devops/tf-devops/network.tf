resource "oci_core_virtual_network" "devops" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "DevOps VCN"
  dns_label      = "devops"
}

resource "oci_core_internet_gateway" "devops_internet_gateway" {
  compartment_id = var.compartment_ocid
  display_name   = "DevOpsInternetGateway"
  vcn_id         = oci_core_virtual_network.devops.id
}

resource "oci_core_default_route_table" "default_route_table" {
  manage_default_resource_id = oci_core_virtual_network.devops.default_route_table_id
  display_name               = "DefaultRouteTable"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.devops_internet_gateway.id
  }
}

resource "oci_core_subnet" "publicsubnet" {
  cidr_block        = "10.0.0.0/24"
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_virtual_network.devops.id
  display_name      = "devops public subnet"
  dns_label         = "devopspublic"
  security_list_ids = [oci_core_virtual_network.devops.default_security_list_id]
  route_table_id    = oci_core_virtual_network.devops.default_route_table_id
  dhcp_options_id   = oci_core_virtual_network.devops.default_dhcp_options_id
}
