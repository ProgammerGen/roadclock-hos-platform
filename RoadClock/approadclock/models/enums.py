from django.db import models

class DutyStatus(models.TextChoices):
    OFF_DUTY = "off", "Off Duty"
    SLEEPER = "sleeper", "Sleeper Berth"
    DRIVING = "driving", "Driving"
    ON_DUTY = "onduty", "On Duty (Not Driving)"

class RuleSetId(models.TextChoices):
    PROPERTY_70_8 = "property_70_8", "Property — 11/14, 70h/8d"
    PROPERTY_60_7 = "property_60_7", "Property — 11/14, 60h/7d"
    PASSENGER_70_8 = "passenger_70_8", "Passenger — 10/15, 70h/8d"
    PASSENGER_60_7 = "passenger_60_7", "Passenger — 10/15, 60h/7d"

class HOSExceptionType(models.TextChoices):
    ADVERSE_DRIVING = "adverse_driving", "Adverse Driving Conditions"
    CDL_SHORT_HAUL = "cdl_short_haul", "CDL Short-Haul Exception"
    NON_CDL_SHORT_HAUL = "non_cdl_short_haul", "Non-CDL Short-Haul Exception"
    SHORT_HAUL_16_HOUR = "short_haul_16_hour", "16-Hour Short-Haul Exception"
    AGRICULTURAL = "agricultural", "Agricultural Operations"
    LOCAL_GOVERNMENT = "local_government", "Local Government Vehicles"
    CONSTRUCTION = "construction", "Construction Vehicles"
    EMERGENCY_RELIEF = "emergency_relief", "Emergency/Relief Vehicles"
    UTILITY_SERVICE = "utility_service", "Utility Service Vehicles"
    OILFIELD = "oilfield", "Oilfield Operations"
    MOVIE_TV = "movie_tv", "Movie/Television Production"
    SCHOOL_BUS = "school_bus", "School Bus Drivers"

class EntrySource(models.TextChoices):
    ELD = "eld", "ELD Automatic"
    MANUAL = "manual", "Manual"
    PERSONAL_CONVEYANCE = "personal_conveyance", "Personal Conveyance"
    YARD_MOVE = "yard_move", "Yard Move"

class AuditEventKind(models.TextChoices):
    STATUS_CHANGE = "status_change", "Status Change"
    MANUAL_ENTRY = "manual_entry", "Manual Entry"
    ALERT = "alert", "Alert"
    EDIT = "edit", "Edit"
    EXPORT = "export", "Export"
    RULE_CHANGE = "rule_change", "Rule Change"
    EXCEPTION = "exception", "Exception"

class ExportType(models.TextChoices):
    CSV = "csv", "CSV"
    PDF = "pdf", "PDF"

class ExportStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"
