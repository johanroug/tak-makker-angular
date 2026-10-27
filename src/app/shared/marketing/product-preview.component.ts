import { Component, input } from '@angular/core';

@Component({
  selector: 'app-product-preview',
  templateUrl: './product-preview.component.html',
  styleUrl: './product-preview.component.scss',
})
export class ProductPreview {
  readonly trade = input('Murer');
  readonly title = input('Nye fliser i entré');
  readonly phase = input(1);
  readonly chat = input(true);
  materialAmount(index: number): string {
    const amounts =
      this.trade() === 'Tømrer'
        ? ['12 m²', '8 stk.', '1 æske']
        : this.trade() === 'Maler'
          ? ['10 liter', '5 liter', '1 rulle']
          : ['12 m²', '5 sække', '1 spand'];
    return amounts[index];
  }
  get work() {
    if (this.trade() === 'Tømrer')
      return ['Klargøring og opmåling', 'Underkonstruktion', 'Terrassebrædder'];
    if (this.trade() === 'Maler')
      return ['Afdækning', 'Spartling og grunding', 'Maling og oprydning'];
    return ['Forberedelse', 'Fliselægning', 'Fugning'];
  }
  get materials() {
    if (this.trade() === 'Tømrer') return ['Terrassebrædder', 'Strøer', 'Terrasseskruer'];
    if (this.trade() === 'Maler') return ['Vægmaling', 'Grunder', 'Afdækning'];
    return ['Klinker', 'Fliseklæber', 'Fugemasse'];
  }
}
