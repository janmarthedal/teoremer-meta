from django.shortcuts import render
from django.views.decorators.http import require_safe
from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect
from django.conf import settings
from main.helpers import init_context
from main.blog_feed import get_blog_feed
from items.models import FinalItem, DraftItem
from users.models import User
from items.helpers import item_search_to_json

@require_safe
def index(request):
    if not settings.DEBUG:
        return HttpResponseRedirect(reverse('main.views.signup'))
    return home(request)

@require_safe
def home(request):
    c = init_context('home')
    c['blog_feed']  = get_blog_feed()
    c['init_items'] = item_search_to_json()
    return render(request, 'home.html', c)

@require_safe
def about(request):
    c = init_context('about') 
    c['def_final']  = FinalItem.objects.filter(itemtype='D', status='F').count()
    c['thm_final']  = FinalItem.objects.filter(itemtype='T', status='F').count()
    c['prf_final']  = FinalItem.objects.filter(itemtype='P', status='F').count()
    c['def_review'] = DraftItem.objects.filter(itemtype='D', status='R').count()
    c['thm_review'] = DraftItem.objects.filter(itemtype='T', status='R').count()
    c['prf_review'] = DraftItem.objects.filter(itemtype='P', status='R').count()
    c['def_draft']  = DraftItem.objects.filter(itemtype='D', status='D').count()
    c['thm_draft']  = DraftItem.objects.filter(itemtype='T', status='D').count()
    c['prf_draft']  = DraftItem.objects.filter(itemtype='P', status='D').count()
    c['user_count'] = User.objects.filter(is_active=True).count()
    return render(request, 'about.html', c)

@require_safe
def signup(request):
    return render(request, 'signup.html')