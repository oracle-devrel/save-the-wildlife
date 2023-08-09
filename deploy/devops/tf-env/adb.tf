locals {
  adb_name = "stwldevopsadb${random_string.deploy_id.result}"
}

resource "oci_database_autonomous_database" "adb" {
  compartment_id = var.compartment_ocid
  db_name        = local.adb_name

  admin_password           = random_password.adb_admin_password.result
  cpu_core_count           = 1
  data_storage_size_in_tbs = 1
  db_workload              = "OLTP"
  display_name             = local.adb_name
  is_auto_scaling_enabled  = true
  license_model            = "BRING_YOUR_OWN_LICENSE"
}
