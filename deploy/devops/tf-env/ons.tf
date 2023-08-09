resource "oci_ons_notification_topic" "devops_ons_topic" {
  compartment_id = var.compartment_ocid
  name           = "topic_${random_string.deploy_id.result}"
  description    = "Notification Topic for ${random_string.deploy_id.result}"
}

resource "oci_ons_subscription" "devops_ons_subscription" {
  compartment_id = var.compartment_ocid
  endpoint       = var.subscription_email
  protocol       = "EMAIL"
  topic_id       = oci_ons_notification_topic.devops_ons_topic.id
}
