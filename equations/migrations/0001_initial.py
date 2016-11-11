# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-29 13:31
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Equation',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('format', models.CharField(max_length=10)),
                ('math', models.TextField()),
                ('html', models.TextField()),
                ('draft_access_at', models.DateTimeField(auto_now_add=True, null=True)),
            ],
            options={
                'db_table': 'equations',
            },
        ),
    ]