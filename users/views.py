from django.shortcuts import render, get_object_or_404
from django.http import HttpResponseRedirect
from django.views.decorators.http import require_safe
from django.core.urlresolvers import reverse
from django.contrib.auth import get_user_model
from main.helpers import init_context, logged_in_or_404
from items.helpers import item_search_to_json

import logging
logger = logging.getLogger(__name__)

@require_safe
def index(request):
    c = init_context('users')
    c['userlist'] = list(get_user_model().objects.filter(is_active=True).order_by('name'))
    return render(request, 'users/index.html', c)

@require_safe
def login(request):
    c = init_context('users')
    c['next'] = request.GET.get('next', reverse('users.views.profile_current'))
    return render(request, 'users/login.html', c)

@require_safe
def profile_id(request, user_id):
    pageuser = get_object_or_404(get_user_model(), pk=user_id)
    c = init_context('users')
    own_profile = request.user == pageuser
    c['pageuser'] = pageuser
    c['init_items'] = item_search_to_json(itemtype='D', user=pageuser)
    c['user_id'] = pageuser.pk
    c['enable_drafts'] = own_profile
    c['own_profile'] = own_profile
    return render(request, 'users/profile.html', c)

@logged_in_or_404
@require_safe
def profile_current(request):
    return HttpResponseRedirect(reverse('users.views.profile_id', args=[request.user.id]))
