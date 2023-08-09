provider "oci" {
  tenancy_ocid = var.tenancy_ocid
  region = var.region
}

provider "oci" {
  alias        = "home_region"
  tenancy_ocid = var.tenancy_ocid
  region       = lookup(data.oci_identity_regions.home_region.regions[0], "name")
}
