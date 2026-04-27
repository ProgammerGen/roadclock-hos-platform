from rest_framework.permissions import AllowAny
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Driver
from ..services import calculate_hos_summary

class HOSSummaryView(APIView):
    """
    Provides a summary of the driver's Hours of Service (HOS).
    """
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        driver_id = self.kwargs.get('driver_id')
        try:
            driver = Driver.objects.get(pk=driver_id)
        except Driver.DoesNotExist:
            raise NotFound(detail="Driver not found.")

        summary = calculate_hos_summary(driver)
        return Response(summary)
