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
    status: 'suggested' | 'accepted' | 'rejected';
    quantity: number;
    quantitySource: 'ai' | null;
    unit: string;
    unitSource: 'ai' | null;
    unitPrice: number;
    priceUpdateRequested: boolean;
    quantityUpdateRequested: boolean;
  }[];
};
