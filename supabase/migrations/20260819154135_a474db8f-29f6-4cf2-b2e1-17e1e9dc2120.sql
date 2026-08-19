-- Remap existing agents to the new roster
update public.agents set key='directeur', name='Éric', role_title='Directeur IA', description='Orchestrateur de l''entreprise : il comprend votre demande, analyse le contexte et distribue les tâches aux autres agents.', color='amber', emoji='🧭' where key='chef';
update public.agents set key='commercial', name='Jason', role_title='Commercial', description='Prospection et ventes : il trouve, qualifie et convertit vos futurs clients.', color='sky', emoji='🤝' where key='prospection';
update public.agents set key='clients', name='Jennifer', role_title='Clients', description='Clients et relation : CRM, fiche 360° et satisfaction au quotidien.', color='emerald', emoji='💬' where key='vente';
update public.agents set key='devis', name='Michael', role_title='Devis', description='Devis et paiements : de l''analyse du besoin jusqu''à la facture réglée.', color='violet', emoji='🧾' where key='devis';
update public.agents set key='marketing', name='Lamine', role_title='Marketing', description='Marketing et contenu : promesses, campagnes, sites et SEO.', color='rose', emoji='📣' where key='marketing';
update public.agents set key='relances', name='Clara', role_title='Relances', description='Relances et suivi : elle n''oublie jamais un devis ou une facture en attente.', color='orange', emoji='⏰' where key='support';
update public.agents set key='projets', name='Chloé', role_title='Projets', description='Projets et production : étapes, tâches, échéances et livraison.', color='lime', emoji='🗂️' where key='projet';
update public.agents set key='rh', name='Salim', role_title='Ressources humaines', description='Recrutement et RH : offres, CV, entretiens et vivier de talents.', color='indigo', emoji='👥' where key='rh';
update public.agents set key='analyse', name='Ethan', role_title='Analyse', description='Analyse et veille : marché, concurrence, e-réputation et recommandations.', color='cyan', emoji='📊' where key='veille';
update public.agents set key='gestion', name='Audrey', role_title='Gestion', description='Finance et administratif : factures, TVA, dépenses et reporting.', color='teal', emoji='📁' where key='analyste';

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_org uuid;
begin
  insert into public.organizations (name, created_by)
  values (coalesce(new.raw_user_meta_data->>'company_name', 'Mon entreprise'), new.id)
  returning id into new_org;

  insert into public.memberships (org_id, user_id, role) values (new_org, new.id, 'owner');

  insert into public.profiles (user_id, full_name, email, current_org_id)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.email, new_org);

  insert into public.agents (org_id, key, name, role_title, description, color, emoji) values
    (new_org,'directeur','Éric','Directeur IA','Orchestrateur de l''entreprise : il comprend votre demande, analyse le contexte et distribue les tâches aux autres agents.','amber','🧭'),
    (new_org,'commercial','Jason','Commercial','Prospection et ventes : il trouve, qualifie et convertit vos futurs clients.','sky','🤝'),
    (new_org,'devis','Michael','Devis','Devis et paiements : de l''analyse du besoin jusqu''à la facture réglée.','violet','🧾'),
    (new_org,'clients','Jennifer','Clients','Clients et relation : CRM, fiche 360° et satisfaction au quotidien.','emerald','💬'),
    (new_org,'relances','Clara','Relances','Relances et suivi : elle n''oublie jamais un devis ou une facture en attente.','orange','⏰'),
    (new_org,'marketing','Lamine','Marketing','Marketing et contenu : promesses, campagnes, sites et SEO.','rose','📣'),
    (new_org,'rh','Salim','Ressources humaines','Recrutement et RH : offres, CV, entretiens et vivier de talents.','indigo','👥'),
    (new_org,'gestion','Audrey','Gestion','Finance et administratif : factures, TVA, dépenses et reporting.','teal','📁'),
    (new_org,'analyse','Ethan','Analyse','Analyse et veille : marché, concurrence, e-réputation et recommandations.','cyan','📊'),
    (new_org,'projets','Chloé','Projets','Projets et production : étapes, tâches, échéances et livraison.','lime','🗂️');

  insert into public.notifications (org_id, user_id, title, body, kind)
  values (new_org, new.id, 'Bienvenue chez Kobyde 👋', 'Éric, votre Directeur IA, et ses 9 agents sont prêts. Parlez-lui pour démarrer.', 'info');

  return new;
end $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;