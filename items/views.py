from django.core.urlresolvers import reverse
from django.http import HttpResponseRedirect, Http404
from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST, require_GET
from document.models import Document
from items.helpers import get_primary_text
from items.models import FinalItem, ItemPagedSearch
from main.helpers import init_context, logged_in_or_404

import logging
logger = logging.getLogger(__name__)

@require_GET
def show_final(request, final_id):
    item = get_object_or_404(FinalItem, final_id=final_id)
    c = init_context(item.itemtype, item=item, proof_count=0,
                     allow={p: request.user.has_perm(p, item)
                            for p in ['add_proof', 'add_source', 'edit', 'add_to_doc', 'delete']},
                     validations=[v.json_data(request.user) for v in item.itemvalidation_set.all()],
                     documents=Document.objects.filter(created_by=request.user.id).exclude(documentitementry__item=item).all())
    if item.itemtype == 'T':
        search = ItemPagedSearch(type='P', status='F', parent=item.final_id)
        c.update(proof_count=item.finalitem_set.filter(itemtype='P', status='F').count(),
                 proofpage=search.make_search(5),
                 see_all_proofs=search.get_url())
    if request.user.is_authenticated():
        c.update(user_id=request.user.id)
    return render(request, 'items/show_final.html', c)

@logged_in_or_404
@require_GET
def edit_final(request, final_id):
    item = get_object_or_404(FinalItem, final_id=final_id)
    if not request.user.has_perm('edit', item):
        raise Http404
    c = init_context(item.itemtype, item=item, primary_text=get_primary_text(item.itemtype))
    return render(request, 'items/edit_final.html', c)

@logged_in_or_404
@require_POST
def delete_final(request, item_id):
    item = get_object_or_404(FinalItem, pk=item_id)
    if not request.user.has_perm('delete', item):
        raise Http404
    item.delete()
    return HttpResponseRedirect(reverse('main.views.index'))

@require_GET
def search(request):
    search = ItemPagedSearch(request=request)
    return search.render(request)
