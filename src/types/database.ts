export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      actualites: {
        Row: {
          article: string | null
          created_at: string | null
          description: string | null
          id: string
          label: string | null
          thumbnail: string | null
          titre: string | null
        }
        Insert: {
          article?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          label?: string | null
          thumbnail?: string | null
          titre?: string | null
        }
        Update: {
          article?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          label?: string | null
          thumbnail?: string | null
          titre?: string | null
        }
        Relationships: []
      }
      avatars: {
        Row: {
          id: string
          url: string
        }
        Insert: {
          id?: string | null
          url: string
        }
        Update: {
          id?: string
          url?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          actif: boolean | null
          categorie_defaut: boolean | null
          created_at: string | null
          criteres_recherche: string[] | null
          icon: string | null
          id: string
          intro: string | null
          nom: string
          position: number | null
          schema_evaluation: Json | null
          slug: string | null
          tags_favoris: Json | null
          tags_groups: Json | null
          tags_liste: Json | null
        }
        Insert: {
          actif?: boolean | null
          categorie_defaut?: boolean | null
          created_at?: string | null
          criteres_recherche?: string[] | null
          icon?: string | null
          id?: string | null
          intro?: string | null
          nom: string
          position?: number | null
          schema_evaluation?: Json | null
          tags_favoris?: Json | null
          tags_groups?: Json | null
          tags_liste?: Json | null
        }
        Update: {
          actif?: boolean | null
          categorie_defaut?: boolean | null
          created_at?: string | null
          criteres_recherche?: string[] | null
          icon?: string | null
          id?: string
          intro?: string | null
          nom?: string
          position?: number | null
          schema_evaluation?: Json | null
          tags_favoris?: Json | null
          tags_groups?: Json | null
          tags_liste?: Json | null
        }
        Relationships: []
      }
      criteres: {
        Row: {
          categorie_id: string | null
          id: string
          identifiant_bis: string | null
          identifiant_tech: string | null
          information: string | null
          is_actif: boolean | null
          is_enfant: boolean | null
          is_parent: boolean | null
          nom_capital: string | null
          nom_court: string | null
          nom_long: string | null
          ordre: number | null
          parent_id: string | null
          question: string | null
          reponse: Json | null
          type: string | null
        }
        Insert: {
          categorie_id?: string | null
          id?: string | null
          identifiant_bis?: string | null
          identifiant_tech?: string | null
          information?: string | null
          is_actif?: boolean | null
          is_enfant?: boolean | null
          is_parent?: boolean | null
          nom_capital?: string | null
          nom_court?: string | null
          nom_long?: string | null
          ordre?: number | null
          parent_id?: string | null
          question?: string | null
          reponse?: Json | null
          type?: string | null
        }
        Update: {
          categorie_id?: string | null
          id?: string
          identifiant_bis?: string | null
          identifiant_tech?: string | null
          information?: string | null
          is_actif?: boolean | null
          is_enfant?: boolean | null
          is_parent?: boolean | null
          nom_capital?: string | null
          nom_court?: string | null
          nom_long?: string | null
          ordre?: number | null
          parent_id?: string | null
          question?: string | null
          reponse?: Json | null
          type?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          description: string | null
          id: string
          ordre: number | null
          titre: string | null
          type: string | null
          url: string | null
          vignette: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Relationships: []
      }
      editeurs: {
        Row: {
          contact_adresse: string | null
          contact_cp: string | null
          contact_email: string | null
          contact_pays: string | null
          contact_telephone: string | null
          contact_ville: string | null
          created_at: string | null
          creation: string | null
          culture: string | null
          description: string | null
          gouvernance: string | null
          id: string
          logo_titre: string | null
          logo_url: string | null
          mot_editeur: string | null
          nb_employes: number | null
          nom: string
          nom_commercial: string | null
          siret: string | null
          updated_at: string | null
          website_titre: string | null
          website_url: string | null
        }
        Insert: {
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          created_at?: string | null
          creation?: string | null
          culture?: string | null
          description?: string | null
          gouvernance?: string | null
          id?: string | null
          logo_titre?: string | null
          logo_url?: string | null
          mot_editeur?: string | null
          nb_employes?: number | null
          nom: string
          nom_commercial?: string | null
          siret?: string | null
          updated_at?: string | null
          website_titre?: string | null
          website_url?: string | null
        }
        Update: {
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          created_at?: string | null
          creation?: string | null
          culture?: string | null
          description?: string | null
          gouvernance?: string | null
          id?: string
          logo_titre?: string | null
          logo_url?: string | null
          mot_editeur?: string | null
          nb_employes?: number | null
          nom?: string
          nom_commercial?: string | null
          siret?: string | null
          updated_at?: string | null
          website_titre?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string | null
          id: string
          last_date_note: string | null
          moyenne_utilisateur: number | null
          scores: Json
          solution_id: string | null
          temps_precedente_solution: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          last_date_note?: string | null
          moyenne_utilisateur?: number | null
          scores: Json
          solution_id?: string | null
          temps_precedente_solution?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_date_note?: string | null
          moyenne_utilisateur?: number | null
          scores?: Json
          solution_id?: string | null
          temps_precedente_solution?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      preferences: {
        Row: {
          id: string
          is_actif: boolean | null
          is_used_creation_compte: boolean | null
          libelle: string
          ordre: number | null
        }
        Insert: {
          id?: string | null
          is_actif?: boolean | null
          is_used_creation_compte?: boolean | null
          libelle: string
          ordre?: number | null
        }
        Update: {
          id?: string
          is_actif?: boolean | null
          is_used_creation_compte?: boolean | null
          libelle?: string
          ordre?: number | null
        }
        Relationships: []
      }
      notes_redac: {
        Row: {
          id: number
          id_solution: string
          identifiant_tech: string
          note: number | null
          avis: string | null
        }
        Insert: {
          id?: number
          id_solution: string
          identifiant_tech: string
          note?: number | null
          avis?: string | null
        }
        Update: {
          id?: number
          id_solution?: string
          identifiant_tech?: string
          note?: number | null
          avis?: string | null
        }
        Relationships: []
      }
      resultats: {
        Row: {
          avis_redac: string | null
          critere_id: string | null
          id: string
          moyenne_utilisateurs: number | null
          moyenne_utilisateurs_base5: number | null
          nb_notes: number | null
          note_redac: number | null
          note_redac_base5: number | null
          notes: Json | null
          notes_critere: Json | null
          nps: number | null
          repartition: Json | null
          solution_id: string | null
        }
        Insert: {
          avis_redac?: string | null
          critere_id?: string | null
          id?: string | null
          moyenne_utilisateurs?: number | null
          moyenne_utilisateurs_base5?: number | null
          nb_notes?: number | null
          note_redac?: number | null
          note_redac_base5?: number | null
          notes?: Json | null
          notes_critere?: Json | null
          nps?: number | null
          repartition?: Json | null
          solution_id?: string | null
        }
        Update: {
          avis_redac?: string | null
          critere_id?: string | null
          id?: string
          moyenne_utilisateurs?: number | null
          moyenne_utilisateurs_base5?: number | null
          nb_notes?: number | null
          note_redac?: number | null
          note_redac_base5?: number | null
          notes?: Json | null
          notes_critere?: Json | null
          nps?: number | null
          repartition?: Json | null
          solution_id?: string | null
        }
        Relationships: []
      }
      solutions_galerie: {
        Row: {
          id: string
          ordre: number | null
          solution_id: string | null
          titre: string | null
          url: string
        }
        Insert: {
          id?: string | null
          ordre?: number | null
          solution_id?: string | null
          titre?: string | null
          url: string
        }
        Update: {
          id?: string
          ordre?: number | null
          solution_id?: string | null
          titre?: string | null
          url?: string
        }
        Relationships: []
      }
      solutions: {
        Row: {
          created_at: string | null
          criteres_actifs: string[] | null
          date_debut: string | null
          date_fin: string | null
          date_fin_vie: string | null
          date_maj: string | null
          date_publication: string | null
          description: string | null
          duree_engagement: Json | null
          evaluation_redac_avis: string | null
          evaluation_redac_note: number | null
          evaluation_redac_points_faibles: string[] | null
          evaluation_redac_points_forts: string[] | null
          id: string
          id_categorie: string | null
          id_editeur: string | null
          lancement: string | null
          logo_titre: string | null
          logo_url: string | null
          meta: Json | null
          mot_editeur: string | null
          nb_utilisateurs: Json | null
          nom: string
          prix: Json | null
          segments: Json | null
          slug: string | null
          updated_at: string | null
          version: string | null
          website: string | null
        }
        Insert: {
          created_at?: string | null
          criteres_actifs?: string[] | null
          date_debut?: string | null
          date_fin?: string | null
          date_fin_vie?: string | null
          date_maj?: string | null
          date_publication?: string | null
          description?: string | null
          duree_engagement?: Json | null
          evaluation_redac_avis?: string | null
          evaluation_redac_note?: number | null
          evaluation_redac_points_faibles?: string[] | null
          evaluation_redac_points_forts?: string[] | null
          id?: string | null
          id_categorie?: string | null
          id_editeur?: string | null
          lancement?: string | null
          logo_titre?: string | null
          logo_url?: string | null
          meta?: Json | null
          mot_editeur?: string | null
          nb_utilisateurs?: Json | null
          nom: string
          prix?: Json | null
          segments?: Json | null
          updated_at?: string | null
          version?: string | null
          website?: string | null
        }
        Update: {
          created_at?: string | null
          criteres_actifs?: string[] | null
          date_debut?: string | null
          date_fin?: string | null
          date_fin_vie?: string | null
          date_maj?: string | null
          date_publication?: string | null
          description?: string | null
          duree_engagement?: Json | null
          evaluation_redac_avis?: string | null
          evaluation_redac_note?: number | null
          evaluation_redac_points_faibles?: string[] | null
          evaluation_redac_points_forts?: string[] | null
          id?: string
          id_categorie?: string | null
          id_editeur?: string | null
          lancement?: string | null
          logo_titre?: string | null
          logo_url?: string | null
          meta?: Json | null
          mot_editeur?: string | null
          nb_utilisateurs?: Json | null
          nom?: string
          prix?: Json | null
          segments?: Json | null
          updated_at?: string | null
          version?: string | null
          website?: string | null
        }
        Relationships: []
      }
      solutions_favorites: {
        Row: {
          created_at: string | null
          solution_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          solution_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          solution_id?: string
          user_id?: string
        }
        Relationships: []
      }
      solutions_tags: {
        Row: {
          id: number
          id_solution: string
          id_tag: string
          ordre: number | null
          is_tag_principal: boolean | null
        }
        Insert: {
          id?: number
          id_solution: string
          id_tag: string
          ordre?: number | null
          is_tag_principal?: boolean | null
        }
        Update: {
          id?: number
          id_solution?: string
          id_tag?: string
          ordre?: number | null
          is_tag_principal?: boolean | null
        }
        Relationships: []
      }
      solutions_utilisees: {
        Row: {
          date_debut: string | null
          date_fin: string | null
          id: string
          solution_id: string | null
          solution_precedente_id: string | null
          statut_evaluation: string | null
          user_id: string | null
        }
        Insert: {
          date_debut?: string | null
          date_fin?: string | null
          id?: string | null
          solution_id?: string | null
          solution_precedente_id?: string | null
          statut_evaluation?: string | null
          user_id?: string | null
        }
        Update: {
          date_debut?: string | null
          date_fin?: string | null
          id?: string
          solution_id?: string | null
          solution_precedente_id?: string | null
          statut_evaluation?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          categorie_id: string | null
          id: string
          is_principale_fonctionnalite: boolean | null
          is_tag_principal: boolean | null
          libelle: string
          ordre: number | null
        }
        Insert: {
          categorie_id?: string | null
          id?: string | null
          is_principale_fonctionnalite?: boolean | null
          is_tag_principal?: boolean | null
          libelle: string
          ordre?: number | null
        }
        Update: {
          categorie_id?: string | null
          id?: string
          is_principale_fonctionnalite?: boolean | null
          is_tag_principal?: boolean | null
          libelle?: string
          ordre?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          age: number | null
          annee_naissance: string | null
          contact_adresse: string | null
          contact_cp: string | null
          contact_email: string | null
          contact_pays: string | null
          contact_telephone: string | null
          contact_ville: string | null
          created_at: string | null
          date_naissance: string | null
          densite_population: string | null
          email: string | null
          gestion_accueil: string | null
          id: string
          is_actif: boolean | null
          is_complete: boolean | null
          mode_exercice: string | null
          niveau_outils_numeriques: string | null
          nom: string | null
          portrait: string | null
          prenom: string | null
          pseudo: string | null
          role: string | null
          rpps: string | null
          specialite: string | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          annee_naissance?: string | null
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          created_at?: string | null
          date_naissance?: string | null
          densite_population?: string | null
          email?: string | null
          gestion_accueil?: string | null
          id?: string | null
          is_actif?: boolean | null
          is_complete?: boolean | null
          mode_exercice?: string | null
          niveau_outils_numeriques?: string | null
          nom?: string | null
          portrait?: string | null
          prenom?: string | null
          pseudo?: string | null
          role?: string | null
          rpps?: string | null
          specialite?: string | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          annee_naissance?: string | null
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          created_at?: string | null
          date_naissance?: string | null
          densite_population?: string | null
          email?: string | null
          gestion_accueil?: string | null
          id?: string
          is_actif?: boolean | null
          is_complete?: boolean | null
          mode_exercice?: string | null
          niveau_outils_numeriques?: string | null
          nom?: string | null
          portrait?: string | null
          prenom?: string | null
          pseudo?: string | null
          role?: string | null
          rpps?: string | null
          specialite?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      pages_statiques: {
        Row: {
          id: string
          slug: string
          titre: string
          image_couverture: string | null
          contenu: string | null
          meta_description: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          slug: string
          titre: string
          image_couverture?: string | null
          contenu?: string | null
          meta_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          slug?: string
          titre?: string
          image_couverture?: string | null
          contenu?: string | null
          meta_description?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      users_preferences: {
        Row: {
          preference_id: string
          user_id: string
        }
        Insert: {
          preference_id?: string | null
          user_id?: string | null
        }
        Update: {
          preference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          description: string | null
          id: string
          is_videos_principales: boolean | null
          ordre: number | null
          titre: string | null
          type: string | null
          url: string | null
          vignette: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          is_videos_principales?: boolean | null
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_videos_principales?: boolean | null
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
