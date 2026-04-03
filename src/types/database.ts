export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      avatars: {
        Row: {
          id: string
          url: string
        }
        Insert: {
          id?: string
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
          criteres_recherche: Json | null
          icon: string | null
          id: string
          image_url: string | null
          intro: string | null
          nom: string
          position: number | null
          schema_evaluation: Json | null
          slug: string | null
        }
        Insert: {
          actif?: boolean | null
          categorie_defaut?: boolean | null
          criteres_recherche?: Json | null
          icon?: string | null
          id: string
          image_url?: string | null
          intro?: string | null
          nom: string
          position?: number | null
          schema_evaluation?: Json | null
          slug?: string | null
        }
        Update: {
          actif?: boolean | null
          categorie_defaut?: boolean | null
          criteres_recherche?: Json | null
          icon?: string | null
          id?: string
          image_url?: string | null
          intro?: string | null
          nom?: string
          position?: number | null
          schema_evaluation?: Json | null
          slug?: string | null
        }
        Relationships: []
      }
      criteres: {
        Row: {
          id: string
          id_categorie: string | null
          identifiant_tech: string | null
          information: string | null
          is_enfant: boolean | null
          is_parent: boolean | null
          nom_capital: string | null
          nom_court: string | null
          nom_long: string | null
          question: string | null
          reponse_max: number | null
          reponse_min: number | null
          reponse_type: string | null
          type: string | null
        }
        Insert: {
          id: string
          id_categorie?: string | null
          identifiant_tech?: string | null
          information?: string | null
          is_enfant?: boolean | null
          is_parent?: boolean | null
          nom_capital?: string | null
          nom_court?: string | null
          nom_long?: string | null
          question?: string | null
          reponse_max?: number | null
          reponse_min?: number | null
          reponse_type?: string | null
          type?: string | null
        }
        Update: {
          id?: string
          id_categorie?: string | null
          identifiant_tech?: string | null
          information?: string | null
          is_enfant?: boolean | null
          is_parent?: boolean | null
          nom_capital?: string | null
          nom_court?: string | null
          nom_long?: string | null
          question?: string | null
          reponse_max?: number | null
          reponse_min?: number | null
          reponse_type?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criteres_id_categorie_fkey"
            columns: ["id_categorie"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      editeurs: {
        Row: {
          contact_adresse: string | null
          contact_cp: string | null
          contact_email: string | null
          contact_pays: string | null
          contact_telephone: string | null
          contact_ville: string | null
          creation: string | null
          culture: string | null
          description: string | null
          gouvernance: string | null
          id: string
          logo_titre: string | null
          logo_url: string | null
          mot_editeur: string | null
          nb_employes: number | null
          nom: string | null
          nom_commercial: string | null
          siret: string | null
          website: string | null
        }
        Insert: {
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          creation?: string | null
          culture?: string | null
          description?: string | null
          gouvernance?: string | null
          id: string
          logo_titre?: string | null
          logo_url?: string | null
          mot_editeur?: string | null
          nb_employes?: number | null
          nom?: string | null
          nom_commercial?: string | null
          siret?: string | null
          website?: string | null
        }
        Update: {
          contact_adresse?: string | null
          contact_cp?: string | null
          contact_email?: string | null
          contact_pays?: string | null
          contact_telephone?: string | null
          contact_ville?: string | null
          creation?: string | null
          culture?: string | null
          description?: string | null
          gouvernance?: string | null
          id?: string
          logo_titre?: string | null
          logo_url?: string | null
          mot_editeur?: string | null
          nb_employes?: number | null
          nom?: string | null
          nom_commercial?: string | null
          siret?: string | null
          website?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          contenu_html: string
          id: string
          sujet: string
          updated_at: string | null
        }
        Insert: {
          contenu_html: string
          id: string
          sujet: string
          updated_at?: string | null
        }
        Update: {
          contenu_html?: string
          id?: string
          sujet?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string | null
          email_temp: string | null
          id: string
          last_date_note: string | null
          moyenne_utilisateur: number | null
          scores: Json
          solution_id: string | null
          statut: string | null
          temps_precedente_solution: string | null
          token_verification: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_temp?: string | null
          id?: string
          last_date_note?: string | null
          moyenne_utilisateur?: number | null
          scores?: Json
          solution_id?: string | null
          statut?: string | null
          temps_precedente_solution?: string | null
          token_verification?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_temp?: string | null
          id?: string
          last_date_note?: string | null
          moyenne_utilisateur?: number | null
          scores?: Json
          solution_id?: string | null
          statut?: string | null
          temps_precedente_solution?: string | null
          token_verification?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_evaluations_solution"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      pages_statiques: {
        Row: {
          contenu: string | null
          created_at: string | null
          id: string
          image_couverture: string | null
          meta_description: string | null
          slug: string
          titre: string
          updated_at: string | null
        }
        Insert: {
          contenu?: string | null
          created_at?: string | null
          id?: string
          image_couverture?: string | null
          meta_description?: string | null
          slug: string
          titre: string
          updated_at?: string | null
        }
        Update: {
          contenu?: string | null
          created_at?: string | null
          id?: string
          image_couverture?: string | null
          meta_description?: string | null
          slug?: string
          titre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      partenaires: {
        Row: {
          actif: boolean | null
          created_at: string | null
          id: string
          lien_url: string | null
          logo_url: string | null
          nom: string
          position: number | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          lien_url?: string | null
          logo_url?: string | null
          nom: string
          position?: number | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          lien_url?: string | null
          logo_url?: string | null
          nom?: string
          position?: number | null
        }
        Relationships: []
      }
      preferences: {
        Row: {
          id: string
          libelle: string | null
        }
        Insert: {
          id: string
          libelle?: string | null
        }
        Update: {
          id?: string
          libelle?: string | null
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
        Relationships: [
          {
            foreignKeyName: "fk_resultats_solution"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resultats_critere_id_fkey"
            columns: ["critere_id"]
            isOneToOne: false
            referencedRelation: "criteres"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions: {
        Row: {
          date_debut: string | null
          date_fin: string | null
          date_maj: string | null
          date_publication: string | null
          description: string | null
          duree_engagement: Json | null
          evaluation_redac_avis: string | null
          evaluation_redac_note: number | null
          evaluation_redac_points_faibles: string[] | null
          evaluation_redac_points_forts: string[] | null
          fin_vie: string | null
          id: string
          id_categorie: string | null
          id_editeur: string | null
          lancement: string | null
          logo_titre: string | null
          logo_url: string | null
          meta: Json | null
          mot_editeur: string | null
          nb_discussions: number | null
          nb_utilisateurs: Json | null
          nom: string
          prix_created: string | null
          prix_devise: string | null
          prix_duree_engagement_mois: number | null
          prix_frequence: string | null
          prix_ttc: number | null
          segments: Json | null
          slug: string | null
          version: string | null
          website: string | null
        }
        Insert: {
          date_debut?: string | null
          date_fin?: string | null
          date_maj?: string | null
          date_publication?: string | null
          description?: string | null
          duree_engagement?: Json | null
          evaluation_redac_avis?: string | null
          evaluation_redac_note?: number | null
          evaluation_redac_points_faibles?: string[] | null
          evaluation_redac_points_forts?: string[] | null
          fin_vie?: string | null
          id?: string
          id_categorie?: string | null
          id_editeur?: string | null
          lancement?: string | null
          logo_titre?: string | null
          logo_url?: string | null
          meta?: Json | null
          mot_editeur?: string | null
          nb_discussions?: number | null
          nb_utilisateurs?: Json | null
          nom: string
          prix_created?: string | null
          prix_devise?: string | null
          prix_duree_engagement_mois?: number | null
          prix_frequence?: string | null
          prix_ttc?: number | null
          segments?: Json | null
          slug?: string | null
          version?: string | null
          website?: string | null
        }
        Update: {
          date_debut?: string | null
          date_fin?: string | null
          date_maj?: string | null
          date_publication?: string | null
          description?: string | null
          duree_engagement?: Json | null
          evaluation_redac_avis?: string | null
          evaluation_redac_note?: number | null
          evaluation_redac_points_faibles?: string[] | null
          evaluation_redac_points_forts?: string[] | null
          fin_vie?: string | null
          id?: string
          id_categorie?: string | null
          id_editeur?: string | null
          lancement?: string | null
          logo_titre?: string | null
          logo_url?: string | null
          meta?: Json | null
          mot_editeur?: string | null
          nb_discussions?: number | null
          nb_utilisateurs?: Json | null
          nom?: string
          prix_created?: string | null
          prix_devise?: string | null
          prix_duree_engagement_mois?: number | null
          prix_frequence?: string | null
          prix_ttc?: number | null
          segments?: Json | null
          slug?: string | null
          version?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solutions_id_categorie_fkey"
            columns: ["id_categorie"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_id_editeur_fkey"
            columns: ["id_editeur"]
            isOneToOne: false
            referencedRelation: "editeurs"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_criteres_actifs: {
        Row: {
          id: number
          id_critere: string | null
          id_solution: string | null
        }
        Insert: {
          id?: number
          id_critere?: string | null
          id_solution?: string | null
        }
        Update: {
          id?: number
          id_critere?: string | null
          id_solution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_criteres_actifs_solution"
            columns: ["id_solution"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_favorites: {
        Row: {
          created_at: string | null
          solution_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          solution_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          solution_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_favorites_solution"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_galerie: {
        Row: {
          description: string | null
          id: number
          id_solution: string | null
          is_videos_principales: boolean | null
          ordre: number | null
          titre: string | null
          type: string | null
          url: string | null
          vignette: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          id_solution?: string | null
          is_videos_principales?: boolean | null
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          id_solution?: string | null
          is_videos_principales?: boolean | null
          ordre?: number | null
          titre?: string | null
          type?: string | null
          url?: string | null
          vignette?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_galerie_solution"
            columns: ["id_solution"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      solutions_tags: {
        Row: {
          id: number
          id_solution: string | null
          id_tag: string | null
          is_tag_principal: boolean | null
          ordre: number | null
        }
        Insert: {
          id?: number
          id_solution?: string | null
          id_tag?: string | null
          is_tag_principal?: boolean | null
          ordre?: number | null
        }
        Update: {
          id?: number
          id_solution?: string | null
          id_tag?: string | null
          is_tag_principal?: boolean | null
          ordre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tags_solution"
            columns: ["id_solution"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
        ]
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
          id?: string
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
        Relationships: [
          {
            foreignKeyName: "fk_utilisees_solution"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solutions_utilisees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          id: string
          id_categorie: string | null
          is_tag_principal: boolean | null
          libelle: string | null
          ordre: number | null
        }
        Insert: {
          id: string
          id_categorie?: string | null
          is_tag_principal?: boolean | null
          libelle?: string | null
          ordre?: number | null
        }
        Update: {
          id?: string
          id_categorie?: string | null
          is_tag_principal?: boolean | null
          libelle?: string | null
          ordre?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_id_categorie_fkey"
            columns: ["id_categorie"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
          id: string
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
      users_preferences: {
        Row: {
          preference_id: string
          user_id: string
        }
        Insert: {
          preference_id: string
          user_id: string
        }
        Update: {
          preference_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          id?: string
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
