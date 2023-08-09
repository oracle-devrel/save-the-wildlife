## Copyright © 2022, Oracle and/or its affiliates. 
## All rights reserved. The Universal Permissive License (UPL), Version 1.0 as shown at http://oss.oracle.com/licenses/upl

resource "oci_core_vcn" "OKE_vcn" {
  cidr_block     = var.VCN-CIDR
  compartment_id = var.compartment_ocid
  display_name   = "OKE_vcn"
}

resource "oci_core_service_gateway" "OKE_sg" {
  compartment_id = var.compartment_ocid
  display_name   = "OKE_sg"
  vcn_id         = oci_core_vcn.OKE_vcn.id
  services {
    service_id = lookup(data.oci_core_services.AllOCIServices.services[0], "id")
  }
}

resource "oci_core_internet_gateway" "OKE_igw" {
  compartment_id = var.compartment_ocid
  display_name   = "OKE_igw"
  vcn_id         = oci_core_vcn.OKE_vcn.id
}

resource "oci_core_route_table" "OKE_rt_via_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.OKE_vcn.id
  display_name   = "OKE_rt_via_igw_and_sg"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.OKE_igw.id
  }

}

resource "oci_core_security_list" "OKE_api_endpoint_subnet_sec_list" {
  compartment_id = var.compartment_ocid
  display_name   = "OKE_api_endpoint_subnet_sec_list"
  vcn_id         = oci_core_vcn.OKE_vcn.id

  # egress_security_rules

  egress_security_rules {
    protocol         = "6"
    destination_type = "CIDR_BLOCK"
    destination      = var.OKE_NodePool_Subnet-CIDR
  }

  egress_security_rules {
    protocol         = 1
    destination_type = "CIDR_BLOCK"
    destination      = var.OKE_NodePool_Subnet-CIDR

    icmp_options {
      type = 3
      code = 4
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination_type = "SERVICE_CIDR_BLOCK"
    destination      = lookup(data.oci_core_services.AllOCIServices.services[0], "cidr_block")

    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.OKE_NodePool_Subnet-CIDR

    tcp_options {
      min = 6443
      max = 6443
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.OKE_NodePool_Subnet-CIDR

    tcp_options {
      min = 12250
      max = 12250
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 6443
      max = 6443
    }
  }

  ingress_security_rules {
    protocol = 1
    source   = var.OKE_NodePool_Subnet-CIDR

    icmp_options {
      type = 3
      code = 4
    }
  }

}

resource "oci_core_security_list" "OKE_nodepool_subnet_sec_list" {
  compartment_id = var.compartment_ocid
  display_name   = "OKE_nodepool_subnet_sec_list"
  vcn_id         = oci_core_vcn.OKE_vcn.id

  egress_security_rules {
    protocol         = "All"
    destination_type = "CIDR_BLOCK"
    destination      = var.OKE_NodePool_Subnet-CIDR
  }

  egress_security_rules {
    protocol    = 1
    destination = "0.0.0.0/0"

    icmp_options {
      type = 3
      code = 4
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination_type = "SERVICE_CIDR_BLOCK"
    destination      = lookup(data.oci_core_services.AllOCIServices.services[0], "cidr_block")
  }

  egress_security_rules {
    protocol         = "6"
    destination_type = "CIDR_BLOCK"
    destination      = var.OKE_API_EndPoint_Subnet-CIDR

    tcp_options {
      min = 6443
      max = 6443
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination_type = "CIDR_BLOCK"
    destination      = var.OKE_API_EndPoint_Subnet-CIDR

    tcp_options {
      min = 12250
      max = 12250
    }
  }

  egress_security_rules {
    protocol         = "6"
    destination_type = "CIDR_BLOCK"
    destination      = "0.0.0.0/0"
  }

  ingress_security_rules {
    protocol = "All"
    source   = var.OKE_NodePool_Subnet-CIDR
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.OKE_API_EndPoint_Subnet-CIDR
  }

  ingress_security_rules {
    protocol = 1
    source   = "0.0.0.0/0"

    icmp_options {
      type = 3
      code = 4
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"

    tcp_options {
      min = 22
      max = 22
    }
  }

}

resource "oci_core_subnet" "OKE_api_endpoint_subnet" {
  cidr_block        = var.OKE_API_EndPoint_Subnet-CIDR
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.OKE_vcn.id
  display_name      = "OKE_api_endpoint_subnet"
  security_list_ids = [oci_core_vcn.OKE_vcn.default_security_list_id, oci_core_security_list.OKE_api_endpoint_subnet_sec_list.id]
  route_table_id    = oci_core_route_table.OKE_rt_via_igw.id
}

resource "oci_core_subnet" "OKE_lb_subnet" {
  cidr_block     = var.OKE_LB_Subnet-CIDR
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.OKE_vcn.id
  display_name   = "OKE_lb_subnet"

  security_list_ids = [oci_core_vcn.OKE_vcn.default_security_list_id]
  route_table_id    = oci_core_route_table.OKE_rt_via_igw.id
}

resource "oci_core_subnet" "OKE_nodepool_subnet" {
  cidr_block        = var.OKE_NodePool_Subnet-CIDR
  compartment_id    = var.compartment_ocid
  vcn_id            = oci_core_vcn.OKE_vcn.id
  display_name      = "OKE_nodepool_subnet"
  security_list_ids = [oci_core_vcn.OKE_vcn.default_security_list_id, oci_core_security_list.OKE_nodepool_subnet_sec_list.id]
  route_table_id    = oci_core_route_table.OKE_rt_via_igw.id
}


