from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DriverViewSet,
    DutyLogEntryViewSet,
    AuditEventViewSet,
    AlertPreferenceViewSet,
    HOSExceptionRecordViewSet,
    ExportRecordViewSet,
    HOSViewSet,
    HOSSummaryView,
)

router = DefaultRouter()
router.register(r"drivers", DriverViewSet, basename="driver")
router.register(r"duty-log-entries", DutyLogEntryViewSet, basename="duty-log-entry")
router.register(r"audit-events", AuditEventViewSet, basename="audit-event")
router.register(r"alert-preferences", AlertPreferenceViewSet, basename="alert-preference")
router.register(r"hos-exceptions", HOSExceptionRecordViewSet, basename="hos-exception")
router.register(r"export-records", ExportRecordViewSet, basename="export-record")
router.register(r"hos", HOSViewSet, basename="hos")

urlpatterns = [
    path("", include(router.urls)),
    path('drivers/<int:driver_id>/hos-summary/', HOSSummaryView.as_view(), name='hos-summary'),
]
