# -*- coding: utf-8 -*-
# Generated by Django 1.10.6 on 2017-04-02 07:06
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('keywords', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='keyword',
            name='name',
            field=models.CharField(max_length=64, unique=True),
        ),
    ]