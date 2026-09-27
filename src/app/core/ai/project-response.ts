export type ProjectResponse = {
  complete: boolean;

  customer: {
    name: string | null;
    address: string | null;
  };

  project: {
    title: string | null;
    description: string | null;
    offerDescription: string | null;
  };

  questions: string[];

  workItems: {
    id: string;
    trade: string;
    description: string;
    descriptionSource: 'ai' | 'user' | null;
    status: 'suggested' | 'accepted' | 'rejected';
    estimatedHours: number | null;
    estimatedHoursSource: 'ai' | 'user';
  }[];

  materials: {
    id: string;
    name: string;
    description: string;
    status: 'suggested' | 'accepted' | 'rejected';
    quantity: number | null;
    quantitySource: 'ai' | null;
    unit: string | null;
    unitSource: 'ai' | null;
    unitPrice: null;
  }[];
};
