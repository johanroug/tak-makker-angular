import { Injectable } from "@angular/core";
import { supabase } from "../supabase/supabase.client";;
import type { ProjectResponse } from "./project-response";

@Injectable({
  providedIn: "root",
})
export class AiService {
  async generateOffer(
    projectId: string,
  ): Promise<ProjectResponse> {
    const { data, error } = await supabase.functions.invoke(
      "generate-offer",
      {
        body: { projectId },
      },
    );

    if (error) {
      console.error("AI ERROR:", error);
      throw new Error("Kunne ikke hente svar fra Tak Makker");
    }

    return data as ProjectResponse;
  }
}