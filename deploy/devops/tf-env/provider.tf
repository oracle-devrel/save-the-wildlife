# TODO: To be modified before pushing to main


provider "oci" {
  tenancy_ocid = var.tenancy_ocid
  region       = var.region
}

provider "oci" {
  alias        = "home_region"
  tenancy_ocid = var.tenancy_ocid
  region       = lookup(data.oci_identity_regions.home_region.regions[0], "name")
}


/*provider "oci" {
  config_file_profile = var.config_file_profile
  region       = var.region
}

provider "oci" {
  alias        = "home_region"
  config_file_profile = var.config_file_profile
  region       = lookup(data.oci_identity_regions.home_region.regions[0], "name")
}*/