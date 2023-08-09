resource "oci_core_virtual_network" "multiplayervcn" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "multiplayer vcn"
  dns_label      = "multiplayervcn"
}

resource "oci_core_internet_gateway" "multiplayervcn_internet_gateway" {
  compartment_id = var.compartment_ocid
  display_name   = "multiplayerInternetGateway"
  vcn_id         = oci_core_virtual_network.multiplayervcn.id
}

resource "oci_core_default_route_table" "default_route_table" {
  manage_default_resource_id = oci_core_virtual_network.multiplayervcn.default_route_table_id
  display_name               = "DefaultRouteTable"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.multiplayervcn_internet_gateway.id
  }
}

resource "oci_core_subnet" "publicsubnet" {
  cidr_block        = "10.0.0.0/24"
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_virtual_network.multiplayervcn.id
  display_name      = "multiplayer public subnet"
  dns_label         = "public"
  security_list_ids = [oci_core_virtual_network.multiplayervcn.default_security_list_id, oci_core_security_list.http_security_list.id]
  route_table_id    = oci_core_virtual_network.multiplayervcn.default_route_table_id
  dhcp_options_id   = oci_core_virtual_network.multiplayervcn.default_dhcp_options_id
}

resource "oci_core_security_list" "http_security_list" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_virtual_network.multiplayervcn.id
  display_name   = "HTTP Security List"

  ingress_security_rules {
    protocol  = "6" // tcp
    source    = "0.0.0.0/0"
    stateless = false

    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol  = "6" // tcp
    source    = "0.0.0.0/0"
    stateless = false

    tcp_options {
      min = 3000
      max = 3000
    }
  }

}
