resource "oci_core_public_ip" "ci_public_reserved_ip" {
  compartment_id = var.compartment_ocid
  lifetime       = "RESERVED"

  lifecycle {
    ignore_changes = [private_ip_id]
  }
}

variable "load_balancer_shape_details_maximum_bandwidth_in_mbps" {
  default = 40
}

variable "load_balancer_shape_details_minimum_bandwidth_in_mbps" {
  default = 10
}

resource "oci_load_balancer" "lb_ci" {
  shape          = "flexible"
  compartment_id = var.compartment_ocid

  subnet_ids = [var.public_subnet_id]

  shape_details {
    maximum_bandwidth_in_mbps = var.load_balancer_shape_details_maximum_bandwidth_in_mbps
    minimum_bandwidth_in_mbps = var.load_balancer_shape_details_minimum_bandwidth_in_mbps
  }

  display_name = "LB CI"

  reserved_ips {
    id = oci_core_public_ip.ci_public_reserved_ip.id
  }
}

resource "oci_load_balancer_backend_set" "lb-backend-set-web" {
  name             = "lb-backend-set-web"
  load_balancer_id = oci_load_balancer.lb_ci.id
  policy           = "ROUND_ROBIN"

  health_checker {
    port                = "80"
    protocol            = "HTTP"
    url_path            = "/"
  }
}

resource "oci_load_balancer_backend_set" "lb-backend-set-server" {
  name             = "lb-backend-set-server"
  load_balancer_id = oci_load_balancer.lb_ci.id
  policy           = "IP_HASH"

  health_checker {
    port                = "3000"
    protocol            = "TCP"
  }
}

resource "oci_load_balancer_listener" "lb-listener" {
  load_balancer_id         = oci_load_balancer.lb_ci.id
  name                     = "http"
  default_backend_set_name = oci_load_balancer_backend_set.lb-backend-set-web.name
  port           = 80
  protocol       = "HTTP"
  routing_policy_name      = oci_load_balancer_load_balancer_routing_policy.routing_policy.name

  connection_configuration {
    idle_timeout_in_seconds = "2"
  }
}

resource "oci_load_balancer_backend" "lb-backend-web" {
  load_balancer_id = oci_load_balancer.lb_ci.id
  backendset_name  = oci_load_balancer_backend_set.lb-backend-set-web.name
  ip_address       = var.ci_private_ip
  port             = 80
  backup           = false
  drain            = false
  offline          = false
  weight           = 1
}
resource "oci_load_balancer_backend" "lb-backend-server" {
  load_balancer_id = oci_load_balancer.lb_ci.id
  backendset_name  = oci_load_balancer_backend_set.lb-backend-set-server.name
  ip_address       = var.ci_private_ip
  port             = 3000
  backup           = false
  drain            = false
  offline          = false
  weight           = 1
}

resource "oci_load_balancer_load_balancer_routing_policy" "routing_policy" {
  condition_language_version = "V1"
  load_balancer_id = oci_load_balancer.lb_ci.id
  name = "routing_policy"
  
  rules {
    name = "routing_to_backend"
    condition = "any(http.request.url.path sw (i '/socket.io'))"
    actions {
      name = "FORWARD_TO_BACKENDSET"
      backend_set_name = oci_load_balancer_backend_set.lb-backend-set-server.name
    }
  }

  rules {
    name = "routing_to_frontend"
    condition = "any(http.request.url.path eq (i '/'))"
    actions {
      name = "FORWARD_TO_BACKENDSET"
      backend_set_name = oci_load_balancer_backend_set.lb-backend-set-web.name
    }
  }
}
