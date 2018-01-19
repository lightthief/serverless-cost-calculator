import React, {Component} from 'react';
import lambda_pricing from './lambda_pricing';

function get_api_gateway_data_transfer_price_table() {

    return [
        {gb: (350 * 1024), price: 0.05},
        {gb: (100 * 1024), price: 0.07},
        {gb: (40 * 1024), price: 0.85},
        {gb: (10 * 1024), price: 0.09}
    ];
}

function find_ram_price(num, d) {

    for (let x = 0; x < d.length; x++) {

        if (num > d[x].ram) continue;
        return d[x].price;
    }
}

function sanitize_form_input(data) {


    return parseInt(data.trim().replace(',', ''), 10) || ''
}

function calculate_api_gateway_data_transfer_price(input_gb_count, price_table, total = 0) {


    if (price_table.length === 0 || input_gb_count < 1) {
        return total;
    }

    const table_item = price_table.pop();

    if (input_gb_count > table_item.gb) {
        total += table_item.gb * table_item.price;

    } else {
        total += input_gb_count * table_item.price;
    }

    input_gb_count -= table_item.gb;
    return calculate_api_gateway_data_transfer_price(input_gb_count, price_table, total);

}


class App extends Component {

    constructor(props) {
        super(props);
        this.state = {
            api_gateway: {
                request_cost: 0,
                data_transfer_cost: 0
            },
            lambda: {
                request_cost: 0.00
            },
            count: 0,
            time: 0,
            ram: 0,
            data_transfer_per_request: 0,
            requests_per_second: 0
        };

        this.handleChange = this.handleChange.bind(this);
    }


    handleChange(event) {

        const data = sanitize_form_input(event.target.value);

        const name = event.target.name;


        const resp = {
            [name]: data,
            api_gateway: {
                request_cost: 0
            },
            lambda: {
                request_cost: 0
            }

        };


        const INPUT_REQUEST_COUNT = name === 'count' ? data : this.state.count;
        const INPUT_REQUEST_LENGTH_IN_MILLISECONDS = name === 'time' ? data : this.state.time;
        const INPUT_RAM_MB = name === 'ram' ? data : this.state.ram;
        const INPUT_DATA_TRANSFERRED_PER_REQUEST = name === 'data_transfer_per_request' ? data : this.state.data_transfer_per_request;


        // Calculate Lambda Costs
        if (INPUT_RAM_MB && INPUT_REQUEST_COUNT && INPUT_REQUEST_LENGTH_IN_MILLISECONDS) {
            const CALCULATED_REQUEST_TIME_FACTOR = Math.ceil(INPUT_REQUEST_LENGTH_IN_MILLISECONDS / 100);
            const CALCULATED_PRICE_PER_100_MILLISECONDS_AT_GIVEN_RAM = find_ram_price(INPUT_RAM_MB, lambda_pricing);
            const CALCULATED_COST_PER_REQUEST = CALCULATED_PRICE_PER_100_MILLISECONDS_AT_GIVEN_RAM * CALCULATED_REQUEST_TIME_FACTOR;

            resp.lambda.request_cost = Math.round(CALCULATED_COST_PER_REQUEST * INPUT_REQUEST_COUNT * 100) / 100;

            // Calculate API gateway Request Costs
            resp.api_gateway.request_cost = Math.round((INPUT_REQUEST_COUNT / 1000000) * 3.5 * 100) / 100;

        }


        if (INPUT_DATA_TRANSFERRED_PER_REQUEST && INPUT_REQUEST_COUNT) {
            const gigs = (INPUT_REQUEST_COUNT * INPUT_DATA_TRANSFERRED_PER_REQUEST) / 1024 / 1024;//gives terabytes

            resp.api_gateway.data_transfer_cost = Math.round(calculate_api_gateway_data_transfer_price(gigs, get_api_gateway_data_transfer_price_table()) * 100) / 100;
        }
        resp.requests_per_second = (INPUT_REQUEST_COUNT / (60 * 60 * 24 * 30)).toFixed(2);
        this.setState(resp);

    }

    render() {

        let total = (this.state.lambda.request_cost + this.state.api_gateway.request_cost + this.state.api_gateway.data_transfer_cost).toFixed(2);

        return (
            <div className="App">
                <div>

                    <div>
                        <label htmlFor="count">Request Count</label>
                        <input type="text" name="count"
                               id="count"
                               placeholder="Request Count"
                               value={this.state.count}
                               onChange={this.handleChange}/>
                    </div>

                    <div>
                        <label htmlFor="time">Time Milliseconds</label>
                        <input type="text" name="time"
                               id="time"
                               placeholder="Request Time"
                               value={this.state.time}
                               onChange={this.handleChange}/>
                    </div>

                    <div>
                        <label htmlFor="ram">Ram MB</label>
                        <input type="text" name="ram"
                               id="ram"
                               placeholder="Request Ram"
                               value={this.state.ram}
                               onChange={this.handleChange}/>
                    </div>


                    <div>
                        <label htmlFor="data_transfer_per_request">Data Transfer Per Request (KB)</label>
                        <input type="text" name="data_transfer_per_request"
                               id="data_transfer_per_request"
                               placeholder="Data Transfer Per Request (KB)"
                               value={this.state.data_transfer_per_request}
                               onChange={this.handleChange}/>
                    </div>

                </div>

                <div>Lambda Cost ~ ${this.state.lambda.request_cost}</div>

                <div>API Gateway Cost ~ ${this.state.api_gateway.request_cost}</div>
                <div>API Gateway Data Transfer Cost ~ ${this.state.api_gateway.data_transfer_cost}</div>
                <div>Total = ${total}</div>
                <div>Request Per Second Given 1 month ~ {this.state.requests_per_second}</div>
            </div>
        );
    }
}

export default App;
