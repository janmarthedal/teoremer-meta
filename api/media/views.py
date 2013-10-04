from django.conf import settings
from django.views.decorators.http import require_GET
from main.helpers import json_decode, json_response
from media.models import MediaItem

@require_GET
def get_links(request):
    ids = json_decode(request.GET['ids'])
    result = {}
    for media_id in ids:
        try:
            item = MediaItem.objects.get(entry__public_id=media_id, itemtype='O')
            result[media_id] = settings.MEDIA_URL + item.path 
        except MediaItem.DoesNotExist:
            result[media_id] = False
    return json_response(result)
