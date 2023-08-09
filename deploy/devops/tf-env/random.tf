resource "random_string" "deploy_id" {
  length  = 4
  special = false
}

resource "random_password" "adb_admin_password" {
  length           = 16
  special          = true
  min_numeric      = 3
  min_special      = 2
  min_lower        = 3
  min_upper        = 3
  override_special = "-_"
}

resource "random_password" "redis_password" {
  length      = 32
  special     = false
  min_numeric = 3
  min_lower   = 3
  min_upper   = 3
}
